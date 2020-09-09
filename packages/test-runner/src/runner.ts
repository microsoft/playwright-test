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
import { spec } from './spec';
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

export class Runner {
  private _suites: Suite[] = [];
  private _config: RunnerConfig;
  private _reporter: Reporter;

  constructor(config: RunnerConfig, files: string[], reporter: Reporter) {
    this._config = config;
    this._reporter = reporter;
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

    for (const file of files) {
      const suite = new Suite('');
      const revertBabelRequire = spec(suite, file, config.timeout);
      require(file);
      revertBabelRequire();
      this._suites.push(suite);
    }
  }

  async run(): Promise<RunResult> {
    if (!this._config.trialRun) {
      await removeFolderAsync(this._config.outputDir).catch(e => {});
      fs.mkdirSync(this._config.outputDir, { recursive: true });
    }

    const testCollector = new TestCollector(this._suites, matrix, this._config);
    const suite = testCollector.suite;
    if (this._config.forbidOnly) {
      const hasOnly = suite.findTest(t => t._only) || suite.eachSuite(s => s._only);
      if (hasOnly)
        return 'forbid-only';
    }

    const total = suite.total();
    if (!total)
      return 'no-tests';
    const { result, timedOut } = await raceAgainstTimeout(this._runTests(suite), this._config.globalTimeout);
    if (timedOut) {
      this._reporter.onTimeout(this._config.globalTimeout);
      process.exit(1);
    }
    return result;
  }

  private async _runTests(suite: Suite): Promise<RunResult> {
    // Trial run does not need many workers, use one.
    const jobs = (this._config.trialRun || this._config.debug) ? 1 : this._config.jobs;
    const runner = new Dispatcher(suite, { ...this._config, jobs }, this._reporter);
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
}
