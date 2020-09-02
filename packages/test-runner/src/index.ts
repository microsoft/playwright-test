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
import { RunnerConfig } from './runnerConfig';
export { parameters } from './fixtures';
export { afterAll, afterEach, beforeAll, beforeEach, describe, fdescribe, fit, it, xdescribe, xit } from './spec';

const mkdirAsync = promisify(fs.mkdir);

declare global {
  interface WorkerState {
    config: RunnerConfig;
    parallelIndex: number;
  }

  interface TestState {
    tmpDir: string;
    outputFile: (suffix: string) => Promise<string>
  }
}

const mkdtempAsync = promisify(fs.mkdtemp);
const removeFolderAsync = promisify(rimraf);

export function registerFixture<T extends keyof TestState>(name: T, fn: (params: WorkerState & TestState, runTest: (arg: TestState[T]) => Promise<void>, info: TestInfo) => Promise<void>) {
  registerFixtureT(name, fn);
}

export function registerWorkerFixture<T extends keyof(WorkerState)>(name: T, fn: (params: WorkerState, runTest: (arg: WorkerState[T]) => Promise<void>, config: RunnerConfig) => Promise<void>) {
  registerWorkerFixtureT(name, fn);
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
