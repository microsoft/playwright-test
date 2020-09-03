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
import * as path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';
import { Dispatcher } from './dispatcher';
import './expect';
import { Reporter } from './reporter';
import { RunnerConfig } from './runnerConfig';
import { Suite } from './test';
import { Matrix, TestCollector } from './testCollector';
import { installTransform } from './transform';
import { raceAgainstTimeout } from './util';
export { Reporter } from './reporter';
export { RunnerConfig } from './runnerConfig';
export { Suite, Test, TestResult, Configuration } from './test';

const removeFolderAsync = promisify(rimraf);

const beforeFunctions: Function[] = [];
const afterFunctions: Function[] = [];
let matrix: Matrix = {};

global['before'] = (fn: Function) => beforeFunctions.push(fn);
global['after'] = (fn: Function) => afterFunctions.push(fn);
global['matrix'] = (m: Matrix) => matrix = m;

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
  const runner = new Dispatcher(suite, { ...config, jobs }, reporter);
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
