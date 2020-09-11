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
import { ParameterRegistration, parameterRegistrations } from './fixtures';
export { Reporter } from './reporter';
export { RunnerConfig } from './runnerConfig';
export { Suite, Test, TestResult, Configuration } from './test';

const removeFolderAsync = promisify(rimraf);

type RunResult = 'passed' | 'failed' | 'forbid-only' | 'no-tests';

export class Runner {
  private _suites: Suite[] = [];
  private _config: RunnerConfig;
  private _reporter: Reporter;
  private _beforeFunctions: Function[] = [];
  private _afterFunctions: Function[] = [];
  private _parameterValues: Matrix = {};

  constructor(config: RunnerConfig, files: string[], reporter: Reporter) {
    this._config = config;
    this._reporter = reporter;

    // First traverse tests.
    for (const file of files) {
      const suite = new Suite('');
      const revertBabelRequire = spec(suite, file, config.timeout, undefined);
      require(file);
      revertBabelRequire();
      this._suites.push(suite);
    }

    // Set default values
    for (const param of this.parameters())
      this.setParameterValue(param.name, param.defaultValue);

    // Then read config.
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
    if (hasSetup) {
      global['setParameterValue'] = this.setParameterValue.bind(this);
      global['setParameterValues'] = this.setParameterValues.bind(this);
      global['before'] = (fn: Function) => this._beforeFunctions.push(fn);
      global['after'] = (fn: Function) => this._afterFunctions.push(fn);
      require(path.join(config.testDir, 'setup'));
    }
    revertBabelRequire();
  }

  parameters(): ParameterRegistration[] {
    return [...parameterRegistrations.values()];
  }

  setParameterValue(name: string, value: string) {
    this.setParameterValues(name, [value]);
  }

  setParameterValues(name: string, values: string[]) {
    if (!parameterRegistrations.has(name))
      throw new Error(`Unregistered parameter '${name}' was set.`);
    this._parameterValues[name] = values;
  }

  async run(): Promise<RunResult> {
    if (!this._config.trialRun) {
      await removeFolderAsync(this._config.outputDir).catch(e => {});
      fs.mkdirSync(this._config.outputDir, { recursive: true });
    }

    const testCollector = new TestCollector(this._suites, this._parameterValues, this._config);
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
      for (const f of this._beforeFunctions)
        await f();
      await runner.run();
      await runner.stop();
    } finally {
      for (const f of this._afterFunctions)
        await f();
    }
    return suite.findTest(test => !test._ok()) ? 'failed' : 'passed';
  }
}
