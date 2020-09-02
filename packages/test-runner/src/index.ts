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
import './expect';
import { registerFixture as registerFixtureT, registerWorkerFixture as registerWorkerFixtureT, TestInfo } from './fixtures';
export { parameters } from './fixtures';
import { Reporter } from './reporter';
import { Runner } from './runner';
import { RunnerConfig } from './runnerConfig';
import { Suite, Test } from './test';
import { Matrix, TestCollector } from './testCollector';
import { installTransform } from './transform';
import { raceAgainstTimeout } from './util';
export { Reporter } from './reporter';
export { RunnerConfig } from './runnerConfig';
export { Suite, Test } from './test';

const mkdirAsync = promisify(fs.mkdir);

interface DescribeFunction {
  describe(name: string, inner: () => void): void;
  describe(name: string, modifier: (suite: Suite) => any, inner: () => void): void;
}

interface ItFunction<STATE> {
  it(name: string, inner: (state: STATE) => Promise<void> | void): void;
  it(name: string, modifier: (test: Test) => any, inner: (state: STATE) => Promise<void> | void): void;
}

declare global {
  interface WorkerState {
    config: RunnerConfig;
    parallelIndex: number;
  }

  interface TestState {
    tmpDir: string;
    outputFile: (suffix: string) => Promise<string>
  }

  const describe: DescribeFunction['describe'] & {
    only: DescribeFunction['describe'];
    skip: DescribeFunction['describe'];
  };
  const fdescribe: DescribeFunction['describe'];
  const xdescribe: DescribeFunction['describe'];

  const it: ItFunction<TestState & WorkerState>['it'] & {
    only: ItFunction<TestState & WorkerState>['it'];
    skip: ItFunction<TestState & WorkerState>['it'];
  };
  const fit: ItFunction<TestState & WorkerState>['it'];
  const xit: ItFunction<TestState & WorkerState>['it'];

  const beforeEach: (inner: (state: TestState & WorkerState) => Promise<void>) => void;
  const afterEach: (inner: (state: TestState & WorkerState) => Promise<void>) => void;
  const beforeAll: (inner: (state: WorkerState) => Promise<void>) => void;
  const afterAll: (inner: (state: WorkerState) => Promise<void>) => void;
}

const mkdtempAsync = promisify(fs.mkdtemp);
const removeFolderAsync = promisify(rimraf);

const beforeFunctions: Function[] = [];
const afterFunctions: Function[] = [];
let matrix: Matrix = {};

global['before'] = (fn: Function) => beforeFunctions.push(fn);
global['after'] = (fn: Function) => afterFunctions.push(fn);
global['matrix'] = (m: Matrix) => matrix = m;

export function registerFixture<T extends keyof TestState>(name: T, fn: (params: WorkerState & TestState, runTest: (arg: TestState[T]) => Promise<void>, info: TestInfo) => Promise<void>) {
  registerFixtureT(name, fn);
}

export function registerWorkerFixture<T extends keyof(WorkerState)>(name: T, fn: (params: WorkerState, runTest: (arg: WorkerState[T]) => Promise<void>, config: RunnerConfig) => Promise<void>) {
  registerWorkerFixtureT(name, fn);
}

type RunResult = 'passed' | 'failed' | 'forbid-only' | 'no-tests';

export async function run(config: RunnerConfig, files: string[], reporter: Reporter): Promise<RunResult> {
  if (!config.trialRun) {
    await removeFolderAsync(config.outputDir).catch(e => {});
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  const revertBabelRequire = installTransform();
  let hasSetup = false;
  try {
    hasSetup = fs.statSync(path.join(config.testDir, 'setup.js')).isFile();
  } catch (e) {
  }
  try {
    hasSetup = hasSetup || fs.statSync(path.join(config.testDir, 'setup.ts')).isFile();
  } catch (e) {
  }
  if (hasSetup)
    require(path.join(config.testDir, 'setup'));
  revertBabelRequire();

  const testCollector = new TestCollector(files, matrix, config);
  const suite = testCollector.suite;
  if (config.forbidOnly) {
    const hasOnly = suite.findTest(t => t._only) || suite.eachSuite(s => s._only);
    if (hasOnly)
      return 'forbid-only';
  }

  const total = suite.total();
  if (!total)
    return 'no-tests';
  const { result, timedOut } = await raceAgainstTimeout(runTests(config, suite, reporter), config.globalTimeout);
  if (timedOut) {
    reporter.onTimeout(config.globalTimeout);
    process.exit(1);
  }
  return result;
}

async function runTests(config: RunnerConfig, suite: Suite, reporter: Reporter) {
  // Trial run does not need many workers, use one.
  const jobs = (config.trialRun || config.debug) ? 1 : config.jobs;
  const runner = new Runner(suite, { ...config, jobs }, reporter);
  try {
    for (const f of beforeFunctions)
      await f();
    await runner.run();
    await runner.stop();
  } finally {
    for (const f of afterFunctions)
      await f();
  }
  return suite.findTest(test => !test._ok()) ? 'failed' : 'passed';
}

registerWorkerFixture('config', async ({}, test) => {
  // Worker injects the value for this one.
  await test(undefined as any);
});

registerWorkerFixture('parallelIndex', async ({}, test) => {
  // Worker injects the value for this one.
  await test(undefined as any);
});

registerFixture('tmpDir', async ({}, test) => {
  const tmpDir = await mkdtempAsync(path.join(os.tmpdir(), 'playwright-test-'));
  await test(tmpDir);
  await removeFolderAsync(tmpDir).catch(e => {});
});

registerFixture('outputFile', async ({}, runTest, info) => {
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
