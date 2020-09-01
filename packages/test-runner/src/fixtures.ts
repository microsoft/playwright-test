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
import { RunnerConfig } from './runnerConfig';
import { serializeError, Test, TestResult } from './test';
import { raceAgainstTimeout } from './util';

type Scope = 'test' | 'worker';

type FixtureRegistration = {
  name: string;
  scope: Scope;
  fn: Function;
};

export type TestInfo = {
  config: RunnerConfig;
  test: Test;
  result: TestResult;
};

const registrations = new Map<string, FixtureRegistration[]>();
const registrationsByFile = new Map<string, FixtureRegistration[]>();
export let parameters: any = {};
export const parameterRegistrations = new Map();

export function setParameters(params: any) {
  parameters = Object.assign(parameters, params);
  for (const name of Object.keys(params))
    registerWorkerFixture(name, async ({}, test) => await test(parameters[name]));
}

class Fixture {
  pool: FixturePool;
  availableRegistrations: FixtureRegistration[];
  name: string;
  scope: Scope;
  fn: Function;
  deps: string[];
  children: Fixture[];
  hasGeneratorValue: boolean;
  value: any;
  _teardownFenceCallback: (value?: unknown) => void;
  _tearDownComplete: Promise<void>;
  _setup = false;
  _teardown = false;

  constructor(pool: FixturePool, name: string, scope: Scope, fn: any, availableRegistrations: FixtureRegistration[]) {
    this.pool = pool;
    this.name = name;
    this.scope = scope;
    this.fn = fn;
    this.deps = fixtureParameterNames(this.fn);
    this.children = [];
    this.hasGeneratorValue = name in parameters;
    this.value = this.hasGeneratorValue ? parameters[name] : null;
    this.availableRegistrations = availableRegistrations;
  }

  async setup(config: RunnerConfig, info?: TestInfo) {
    if (this.hasGeneratorValue)
      return;
    const params = {};
    for (const name of this.deps) {
      const fixture = await this.pool.setupFixture(name, config, info, this.availableRegistrations);
      this.children.push(fixture);
      params[name] = fixture.value;
    }

    let setupFenceFulfill: {(): void; (value?: unknown): void;};
    let setupFenceReject: {(arg0: any): any; (reason?: any): void;};
    const setupFence = new Promise((f, r) => {setupFenceFulfill = f; setupFenceReject = r;});
    const teardownFence = new Promise(f => this._teardownFenceCallback = f);
    debug('pw:test:hook')(`setup "${this.name}"`);
    const param = info || config;
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
    for (const fixture of this.children)
      await fixture.teardown();

    if (this._setup) {
      debug('pw:test:hook')(`teardown "${this.name}"`);
      this._teardownFenceCallback();
      await this._tearDownComplete;
    }
    this.pool.instances.delete(this.name);
  }
}

export class FixturePool {
  instances: Map<string, Fixture>;
  constructor() {
    this.instances = new Map();
  }

  async setupFixture(name: string, config: RunnerConfig, info: TestInfo, availableParentRegistrations: FixtureRegistration[]): Promise<Fixture> {
    if (!registrations.has(name))
      throw new Error('Unknown fixture: ' + name);
    const registation = availableParentRegistrations[availableParentRegistrations.length - 1];
    const {scope, fn} = registation;
    const availableRegistrations = availableParentRegistrations.slice(0, availableParentRegistrations.length - 1);
    const fixture = new Fixture(this, name, scope, fn, availableRegistrations);
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
    const params = {};
    const names = fixtureParameterNames(fn);
    for (const name of names) {
      const fixture = await this.setupFixture(name, config, info, registrations.get(name));
      params[name] = fixture.value;
    }
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

export function fixturesForCallback(callback: Function): string[] {
  const names = new Array<string>();
  const name2Idx = new Map<string, number>();
  const visit = (callback: Function) => {
    for (const name of fixtureParameterNames(callback)) {
      names.push(name);
      if (!registrations.has(name))
        throw new Error('Using undefined fixture ' + name);
      if (!name2Idx.has(name))
        name2Idx.set(name, 0);
      else
        name2Idx.set(name, name2Idx.get(name) + 1);
      if (name2Idx.get(name) > registrations.get(name).length - 1)
        throw new Error(`Fixture '${name}' not yet available in function. Maybe wrong order?`);
      const { fn } = registrations.get(name)[name2Idx.get(name)];
      visit(fn);
    }
  };
  visit(callback);
  const result = [...names];
  result.sort();
  return result;
}

function fixtureParameterNames(fn: Function): string[] {
  const text = fn.toString();
  const match = text.match(/async(?:\s+function)?\s*\(\s*{\s*([^}]*)\s*}/);
  if (!match || !match[1].trim())
    return [];
  const signature = match[1];
  return signature.split(',').map((t: string) => t.trim());
}

function innerRegisterFixture(name: string, scope: Scope, fn: Function, caller: Function) {
  const obj = {stack: ''};
  Error.captureStackTrace(obj, caller);
  const stackFrame = obj.stack.split('\n')[2];
  const location = stackFrame.replace(/.*at Object.<anonymous> \((.*)\)/, '$1');
  const file = location.replace(/^(.+):\d+:\d+$/, '$1');
  const registration = { name, scope, fn, file, location };
  if (!registrations.has(name))
    registrations.set(name, []);
  registrations.set(name, [...registrations.get(name), registration]);
  if (!registrationsByFile.has(file))
    registrationsByFile.set(file, []);
  registrationsByFile.get(file).push(registration);
}

export function registerFixture(name: string, fn: (params: any, runTest: (arg: any) => Promise<void>, info: TestInfo) => Promise<void>) {
  innerRegisterFixture(name, 'test', fn, registerFixture);
}

export function registerWorkerFixture(name: string, fn: (params: any, runTest: (arg: any) => Promise<void>, config: RunnerConfig) => Promise<void>) {
  innerRegisterFixture(name, 'worker', fn, registerWorkerFixture);
}

export function registerParameter(name: string, fn: () => any) {
  registerWorkerFixture(name, async ({}: any, test: Function) => await test(parameters[name]));
  parameterRegistrations.set(name, fn);
}

function collectRequires(file: string, result: Set<string>) {
  if (result.has(file))
    return;
  result.add(file);
  const cache = require.cache[file];
  if (!cache)
    return;
  const deps = cache.children.map((m: { id: any; }) => m.id).slice().reverse();
  for (const dep of deps)
    collectRequires(dep, result);
}

export function lookupRegistrations(file: string, scope: Scope): Map<string, FixtureRegistration[]> {
  const deps = new Set<string>();
  collectRequires(file, deps);
  const allDeps = [...deps].reverse();
  const result = new Map<string, FixtureRegistration[]>();
  for (const dep of allDeps) {
    const registrationList = registrationsByFile.get(dep);
    if (!registrationList)
      continue;
    for (const r of registrationList) {
      if (scope && r.scope !== scope)
        continue;
      if (!result.has(r.name))
        result.set(r.name, []);
      result.set(r.name, [...result.get(r.name), r]);
    }
  }
  return result;
}

export function rerunRegistrations(file: string, scope: Scope) {
  // When we are running several tests in the same worker, we should re-run registrations before
  // each file. That way we erase potential fixture overrides from the previous test runs.
  for (const registration of lookupRegistrations(file, scope).values())
    registrations.set(registration[0].name, registration);
}
