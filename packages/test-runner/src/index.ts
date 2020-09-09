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

interface DescribeHelper {
  describe(name: string, inner: () => void): void;
  describe(name: string, modifier: (suite: Suite) => any, inner: () => void): void;
}
type DescribeFunction = DescribeHelper['describe'];
interface ItHelper<WorkerState, TestState> {
  it(name: string, inner: (state: WorkerState & TestState) => Promise<void> | void): void;
  it(name: string, modifier: (test: Test) => any, inner: (state: WorkerState & TestState) => Promise<void> | void): void;
}
type ItFunction<WorkerState, TestState> = ItHelper<WorkerState, TestState>['it'];
type It<WorkerState, TestState> = ItFunction<WorkerState, TestState> & {
  only: ItFunction<WorkerState, TestState>;
  skip: ItFunction<WorkerState, TestState>;
};
type Fit<WorkerState, TestState> = ItFunction<WorkerState, TestState>;
type Xit<WorkerState, TestState> = ItFunction<WorkerState, TestState>;
type Describe = DescribeFunction & {
  only: DescribeFunction;
  skip: DescribeFunction;
};
type FDescribe = DescribeFunction;
type XDescribe = DescribeFunction;
type BeforeEach<WorkerState, TestState> = (inner: (state: WorkerState & TestState) => Promise<void>) => void;
type AfterEach<WorkerState, TestState> = (inner: (state: WorkerState & TestState) => Promise<void>) => void;
type BeforeAll<WorkerState> = (inner: (state: WorkerState) => Promise<void>) => void;
type AfterAll<WorkerState> = (inner: (state: WorkerState) => Promise<void>) => void;

class Fixtures<WorkerState, TestState> {
  it: It<WorkerState, TestState> = spec.it;
  fit: Fit<WorkerState, TestState> = spec.it.only;
  xit: Xit<WorkerState, TestState> = spec.it.skip;
  describe: Describe = spec.describe;
  fdescribe: FDescribe = spec.describe.only;
  xdescribe: XDescribe = spec.describe.skip;
  beforeEach: BeforeEach<WorkerState, TestState> = spec.beforeEach;
  afterEach: AfterEach<WorkerState, TestState> = spec.afterEach;
  beforeAll: BeforeAll<WorkerState> = spec.beforeAll;
  afterAll: AfterAll<WorkerState> = spec.afterAll;
  expect: typeof expectFunction = expectFunction;
  parameters: typeof parametersObject = parametersObject;

  union<W1, T1>(other1: Fixtures<W1, T1>): Fixtures<WorkerState & W1, TestState & T1>;
  union<W1, T1, W2, T2>(other1: Fixtures<W1, T1>, other2: Fixtures<W2, T2>): Fixtures<WorkerState & W1 & W2, TestState & T1 & T2>;
  union<W1, T1, W2, T2, W3, T3>(other1: Fixtures<W1, T1>, other2: Fixtures<W2, T2>, other3: Fixtures<W3, T3>): Fixtures<WorkerState & W1 & W2 & W3, TestState & T1 & T2 & T3>;
  union(...others) {
    return this;
  }

  extend<W, T>(): Fixtures<WorkerState & W, TestState & T> {
    return this as any;
  }

  registerWorkerFixture<T extends keyof WorkerState>(name: T, fn: (params: WorkerState, runTest: (arg: WorkerState[T]) => Promise<void>, config: RunnerConfig) => Promise<void>) {
    // TODO: make this throw when overriding.
    registerWorkerFixtureImpl(name as string, fn);
  }

  registerFixture<T extends keyof TestState>(name: T, fn: (params: WorkerState & TestState, runTest: (arg: TestState[T]) => Promise<void>, info: TestInfo) => Promise<void>) {
    // TODO: make this throw when overriding.
    registerFixtureImpl(name as string, fn);
  }

  overrideWorkerFixture<T extends keyof WorkerState>(name: T, fn: (params: WorkerState, runTest: (arg: WorkerState[T]) => Promise<void>, config: RunnerConfig) => Promise<void>) {
    // TODO: make this throw when not overriding.
    registerWorkerFixtureImpl(name as string, fn);
  }

  overrideFixture<T extends keyof TestState>(name: T, fn: (params: WorkerState & TestState, runTest: (arg: TestState[T]) => Promise<void>, info: TestInfo) => Promise<void>) {
    // TODO: make this throw when not overriding.
    registerFixtureImpl(name as string, fn);
  }
}

export type DefaultWorkerState = {
  config: RunnerConfig;
  parallelIndex: number;
};
export type DefaultTestState = {
  tmpDir: string;
  outputFile: (suffix: string) => Promise<string>;
};

export const fixtures = new Fixtures<DefaultWorkerState, DefaultTestState>();

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
