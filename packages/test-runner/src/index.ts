/**
 * Copyright 2019 Google Inc. All rights reserved.
 * Modifications copyright (c) Microsoft Corporation.
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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';
import { registerFixture as registerFixtureImpl, registerWorkerFixture as registerWorkerFixtureImpl, TestInfo } from './fixtures';
import { RunnerConfig } from './runnerConfig';
import { expect as expectFunction } from './expect';
import { parameters as parametersObject } from './fixtures';
import * as spec from './spec';
import { Test, Suite } from './test';

const mkdirAsync = promisify(fs.mkdir);
const mkdtempAsync = promisify(fs.mkdtemp);
const removeFolderAsync = promisify(rimraf);

interface BaseState {
  worker?: object;
  test?: object;
}
interface DescribeHelper {
  describe(name: string, inner: () => void): void;
  describe(name: string, modifier: (suite: Suite) => any, inner: () => void): void;
}
type DescribeFunction = DescribeHelper['describe'];
interface ItHelper<STATE extends BaseState> {
  it(name: string, inner: (state: STATE['worker'] & STATE['test']) => Promise<void> | void): void;
  it(name: string, modifier: (test: Test) => any, inner: (state: STATE['worker'] & STATE['test']) => Promise<void> | void): void;
}
type ItFunction<STATE extends BaseState> = ItHelper<STATE>['it'];
type It<STATE extends BaseState> = ItFunction<STATE> & {
  only: ItFunction<STATE>;
  skip: ItFunction<STATE>;
};
type Fit<STATE extends BaseState> = ItFunction<STATE>;
type Xit<STATE extends BaseState> = ItFunction<STATE>;
type Describe = DescribeFunction & {
  only: DescribeFunction;
  skip: DescribeFunction;
};
type FDescribe = DescribeFunction;
type XDescribe = DescribeFunction;
type BeforeEach<STATE extends BaseState> = (inner: (state: STATE['worker'] & STATE['test']) => Promise<void>) => void;
type AfterEach<STATE extends BaseState> = (inner: (state: STATE['worker'] & STATE['test']) => Promise<void>) => void;
type BeforeAll<STATE extends BaseState> = (inner: (state: STATE['worker']) => Promise<void>) => void;
type AfterAll<STATE extends BaseState> = (inner: (state: STATE['worker']) => Promise<void>) => void;

class Fixtures<STATE extends BaseState> {
  it: It<STATE> = spec.it;
  fit: Fit<STATE> = spec.it.only;
  xit: Xit<STATE> = spec.it.skip;
  describe: Describe = spec.describe;
  fdescribe: FDescribe = spec.describe.only;
  xdescribe: XDescribe = spec.describe.skip;
  beforeEach: BeforeEach<STATE> = spec.beforeEach;
  afterEach: AfterEach<STATE> = spec.afterEach;
  beforeAll: BeforeAll<STATE> = spec.beforeAll;
  afterAll: AfterAll<STATE> = spec.afterAll;
  expect: typeof expectFunction = expectFunction;
  parameters: typeof parametersObject = parameters;

  extend<T extends BaseState>(): Fixtures<STATE & T> {
    return this as any as Fixtures<STATE & T>;
  }

  registerWorkerFixture<T extends keyof STATE['worker']>(name: T, fn: (params: STATE['worker'], runTest: (arg: STATE['worker'][T]) => Promise<void>, config: RunnerConfig) => Promise<void>) {
    // TODO: make this throw when overriding.
    registerWorkerFixtureImpl(name as string, fn);
  }

  registerFixture<T extends keyof STATE['test']>(name: T, fn: (params: STATE['worker'] & STATE['test'], runTest: (arg: STATE['test'][T]) => Promise<void>, info: TestInfo) => Promise<void>) {
    // TODO: make this throw when overriding.
    registerFixtureImpl(name as string, fn);
  }

  overrideWorkerFixture<T extends keyof STATE['worker']>(name: T, fn: (params: STATE['worker'], runTest: (arg: STATE['worker'][T]) => Promise<void>, config: RunnerConfig) => Promise<void>) {
    // TODO: make this throw when not overriding.
    registerWorkerFixtureImpl(name as string, fn);
  }

  overrideFixture<T extends keyof STATE['test']>(name: T, fn: (params: STATE['worker'] & STATE['test'], runTest: (arg: STATE['test'][T]) => Promise<void>, info: TestInfo) => Promise<void>) {
    // TODO: make this throw when not overriding.
    registerFixtureImpl(name as string, fn);
  }
}

export type DefaultState = {
  worker: {
    config: RunnerConfig;
    parallelIndex: number;
  };
  test: {
    tmpDir: string;
    outputFile: (suffix: string) => Promise<string>;
  };
};
export const fixtures = new Fixtures<DefaultState>();
export const it = fixtures.it;
export const fit = fixtures.fit;
export const xit = fixtures.xit;
export const describe = fixtures.describe;
export const fdescribe = fixtures.fdescribe;
export const xdescribe = fixtures.xdescribe;
export const beforeEach = fixtures.beforeEach;
export const afterEach = fixtures.afterEach;
export const beforeAll = fixtures.beforeAll;
export const afterAll = fixtures.afterAll;
export const parameters = fixtures.parameters;
export const expect = fixtures.expect;
export const registerFixture = fixtures.registerFixture;
export const registerWorkerFixture = fixtures.registerWorkerFixture;
export const overrideFixture = fixtures.overrideFixture;
export const overrideWorkerFixture = fixtures.overrideWorkerFixture;

fixtures.registerWorkerFixture('config', async ({}, test) => {
  // Worker injects the value for this one.
  await test(undefined as any);
});

fixtures.registerWorkerFixture('parallelIndex', async ({}, test) => {
  // Worker injects the value for this one.
  await test(undefined as any);
});

fixtures.registerFixture('tmpDir', async ({}, test) => {
  const tmpDir = await mkdtempAsync(path.join(os.tmpdir(), 'playwright-test-'));
  await test(tmpDir);
  await removeFolderAsync(tmpDir).catch(e => {});
});

fixtures.registerFixture('outputFile', async ({}, runTest, info) => {
  const outputFile = async (suffix: string): Promise<string> => {
    const {config, test} = info;
    const relativePath = path.relative(config.testDir, test.file)
        .replace(/\.spec\.[jt]s/, '')
        .replace(new RegExp(`(tests|test|src)${path.sep}`), '');
    const sanitizedTitle = test.title.replace(/[^\w\d]+/g, '_');
    const assetPath = path.join(config.outputDir, relativePath, `${sanitizedTitle}-${suffix}`);
    await mkdirAsync(path.dirname(assetPath), {
      recursive: true
    });
    return assetPath;
  };
  await runTest(outputFile);
});
