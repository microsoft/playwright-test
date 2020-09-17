/**
 * Copyright Microsoft Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import debug from 'debug';
import * as fs from 'fs';
import { RunnerConfig } from './runnerConfig';
import { serializeError, Test, TestResult } from './test';
import { raceAgainstTimeout } from './util';
import {parse} from '@babel/core';

type Scope = 'test' | 'worker';

export type FixtureRegistration = {
  name: string;
  scope: Scope;
  fn: Function;
  file: string;
  location: string;
  super?: FixtureRegistration;
};

export type TestInfo = {
  config: RunnerConfig;
  test: Test;
  result: TestResult;
};

const registrations = new Map<string, FixtureRegistration>();
const registrationsByFile = new Map<string, FixtureRegistration[]>();
export let parameters: any = {};

export type ParameterRegistration = {
  name: string;
  description: string;
  defaultValue?: string;
};

export const parameterRegistrations = new Map<string, ParameterRegistration>();

export function assignParameters(params: any) {
  parameters = Object.assign(parameters, params);
}

export const matrix: any = {};

class Fixture {
  pool: FixturePool;
  name: string;
  scope: Scope;
  fn: Function;
  deps: FixtureRegistration[];
  usages: Set<FixtureRegistration>;
  hasGeneratorValue: boolean;
  value: any;
  registration: FixtureRegistration;
  _teardownFenceCallback: (value?: unknown) => void;
  _tearDownComplete: Promise<void>;
  _setup = false;
  _teardown = false;

  constructor(pool: FixturePool, registration: FixtureRegistration) {
    this.pool = pool;
    this.name = registration.name;
    this.scope = registration.scope;
    this.fn = registration.fn;
    this.registration = registration;
    this.deps = fixtureParameterNames(this.fn).map(name => name === this.name ? registration.super : getRegistration(name));
    this.usages = new Set();
    this.hasGeneratorValue = this.name in parameters;
    this.value = this.hasGeneratorValue ? parameters[this.name] : null;
  }

  async setup(config: RunnerConfig, info?: TestInfo) {
    if (this.hasGeneratorValue)
      return;
    for (const registration of this.deps) {
      await this.pool.setupFixture(registration, config, info);
      this.pool.instances.get(registration).usages.add(registration);
    }

    const params = {};
    for (const registration of this.deps)
      params[registration.name] = this.pool.instances.get(registration).value;
    let setupFenceFulfill: { (): void; (value?: unknown): void; };
    let setupFenceReject: { (arg0: any): any; (reason?: any): void; };
    const setupFence = new Promise((f, r) => { setupFenceFulfill = f; setupFenceReject = r; });
    const teardownFence = new Promise(f => this._teardownFenceCallback = f);
    debug('pw:test:hook')(`setup "${this.name}"`);
    const param = this.scope === 'worker' ? config : info;
    this._tearDownComplete = this.fn(params, async (value: any) => {
      this.value = value;
      setupFenceFulfill();
      return await teardownFence;
    }, param).catch((e: any) => setupFenceReject(e));
    await setupFence;
    this._setup = true;
  }

  async teardown() {
    if (this.hasGeneratorValue)
      return;
    if (this._teardown)
      return;
    this._teardown = true;
    for (const registration of this.usages) {
      const fixture = this.pool.instances.get(registration);
      if (!fixture)
        continue;
      await fixture.teardown();
    }
    if (this._setup) {
      debug('pw:test:hook')(`teardown "${this.name}"`);
      this._teardownFenceCallback();
      await this._tearDownComplete;
    }
    this.pool.instances.delete(this.registration);
  }
}

export class FixturePool {
  instances = new Map<FixtureRegistration, Fixture>();

  async setupFixture(registration: FixtureRegistration, config: RunnerConfig, info?: TestInfo) {
    let fixture = this.instances.get(registration);
    if (fixture)
      return fixture;

    fixture = new Fixture(this, registration);
    this.instances.set(registration, fixture);
    await fixture.setup(config, info);
    return fixture;
  }

  async teardownScope(scope: string) {
    for (const [, fixture] of this.instances) {
      if (fixture.scope === scope)
        await fixture.teardown();
    }
  }

  async resolveParametersAndRun(fn: Function, config: RunnerConfig, info?: TestInfo) {
    const names = fixtureParameterNames(fn);
    for (const name of names)
      await this.setupFixture(getRegistration(name), config, info);
    const params = {};
    for (const n of names)
      params[n] = this.instances.get(getRegistration(n)).value;
    return fn(params);
  }

  async runTestWithFixturesAndTimeout(fn: Function, timeout: number, info: TestInfo) {
    const { timedOut } = await raceAgainstTimeout(this._runTestWithFixtures(fn, info), timeout);
    // Do not overwrite test failure upon timeout in fixture.
    if (timedOut && info.result.status === 'passed')
      info.result.status = 'timedOut';
  }

  async _runTestWithFixtures(fn: Function, info: TestInfo) {
    try {
      await this.resolveParametersAndRun(fn, info.config, info);
      info.result.status = 'passed';
    } catch (error) {
      // Prefer original error to the fixture teardown error or timeout.
      if (info.result.status === 'passed') {
        info.result.status = 'failed';
        info.result.error = serializeError(error);
      }
    }
    try {
      await this.teardownScope('test');
    } catch (error) {
      // Prefer original error to the fixture teardown error or timeout.
      if (info.result.status === 'passed') {
        info.result.status = 'failed';
        info.result.error = serializeError(error);
      }
    }
  }
}

function getRegistration(name: string) {
  // It might seem that the below code is not correct, but we believe it is.
  // For example, consider the case where we run testA.spec.ts and testB.spec.ts in the same worker.
  // testA uses fixture "page" and testB overrides and uses fixture "page". Since we `rerun` test fixtures
  // in the order of the require traversal, correct fixtures will be "on top" of the `registrations` map and will
  // be looked up.
  // And it does not matter for the worker level fixtures because complete worker fixture registration tree is
  // captured in the worker hash, hence we know that all the tests in the same worker will share that fingerprint
  // and that the latest fixture will be "on top" of the map.
  const registration = registrations.get(name);
  if (!registration)
    throw new Error(`Could not find fixture "${name}"`);
  return registration;
}

export function fixturesForCallback(callback: Function): FixtureRegistration[] {
  const names = new Set<FixtureRegistration>();
  const visit = (registration: FixtureRegistration) => {
    if (names.has(registration))
      return;
    names.add(registration);
    for (const name of fixtureParameterNames(registration.fn)) {
      if (!registrations.has(name))
        throw new Error('Using undefined fixture ' + name);
      // todo error if trying to use undefined super;
      const next = name === registration.name ? registration.super : getRegistration(name);
      if (!next)
        throw new Error(`Cannot use fixture ${name} before it is defined.`);
      visit(next);
    }
  };
  for (const name of fixtureParameterNames(callback))
    visit(getRegistration(name));
  const result = [...names];
  result.sort();
  return result;
}

const signatureSymbol = Symbol('signature');

function fixtureParameterNames(fn: Function): string[] {
  if (!fn[signatureSymbol])
    fn[signatureSymbol] = innerFixtureParameterNames(fn);
  return fn[signatureSymbol];
}

function innerFixtureParameterNames(fn: Function): string[] {
  const text = fn.toString();
  const match = text.match(/(?:async)?(?:\s+function)?[^\(]*\(([^})]*)/);
  if (!match)
    return [];
  const trimmedParams = match[1].trim();
  if (!trimmedParams)
    return [];
  if (trimmedParams && trimmedParams[0] !== '{')
    throw new Error('First argument must use the object destructuring pattern.'  + trimmedParams);
  const signature = trimmedParams.substring(1).trim();
  if (!signature)
    return [];
  return signature.split(',').map((t: string) => t.trim().split(':')[0].trim());
}

function innerRegisterFixture(name: string, scope: Scope, fn: Function, caller: Function) {
  const obj = {stack: ''};
  // disable source-map-support to match the locations seen in require.cache
  const origPrepare = Error.prepareStackTrace;
  Error.prepareStackTrace = null;
  Error.captureStackTrace(obj, caller);
  // v8 doesn't actually prepare the stack trace until we access it
  obj.stack;
  Error.prepareStackTrace = origPrepare;

  const stackFrame = obj.stack.split('\n')[2];
  const location = stackFrame.replace(/.*at Object.<anonymous> \((.*)\)/, '$1');
  const file = location.replace(/^(.+):\d+:\d+$/, '$1');
  const registration = { name, scope, fn, file, location };
  setRegistration(name, registration);
  if (!registrationsByFile.has(file))
    registrationsByFile.set(file, []);
  registrationsByFile.get(file).push(registration);
}

function setRegistration(name: string, registration: FixtureRegistration) {
  registration.super = registrations.get(name);
  registrations.set(name, registration);
}

export function registerFixture(name: string, fn: (params: any, runTest: (arg: any) => Promise<void>, info: TestInfo) => Promise<void>) {
  innerRegisterFixture(name, 'test', fn, registerFixture);
}

export function registerWorkerFixture(name: string, fn: (params: any, runTest: (arg: any) => Promise<void>, config: RunnerConfig) => Promise<void>) {
  innerRegisterFixture(name, 'worker', fn, registerWorkerFixture);
}

export function registerWorkerParameter(name: string, description: string, defaultValue?: any) {
  parameterRegistrations.set(name, { name, description, defaultValue });
}

export function setParameterValues(name: string, values: any[]) {
  if (!parameterRegistrations.has(name))
    throw new Error(`Unregistered parameter '${name}' was set.`);
  matrix[name] = values;
}

function collectRequires(file: string, result: Set<string>) {
  if (result.has(file))
    return;
  result.add(file);
  const cache = require.cache[file];
  if (!cache)
    return;
  const deps = cache.children.map((m: { id: any; }) => m.id).slice();
  for (const dep of deps)
    collectRequires(dep, result);
  result.delete(file);
  result.add(file);
}

function * lookupRegistrations(file: string): Iterable<FixtureRegistration> {
  const deps = new Set<string>();
  collectRequires(file, deps);
  for (const dep of deps) {
    const registrationList = registrationsByFile.get(dep);
    if (!registrationList)
      continue;
    yield * registrationList;
  }
}

export function rerunRegistrations(file: string) {
  // Resolve symlinks.
  file = fs.realpathSync(file);
  registrations.clear();
  // When we are running several tests in the same worker, we should re-run registrations before
  // each file. That way we erase potential fixture overrides from the previous test runs.
  for (const registration of lookupRegistrations(file))
    setRegistration(registration.name, registration);
}
