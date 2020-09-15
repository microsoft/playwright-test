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
import { serializeError, Suite } from './test';
import { Matrix, parseTests } from './testCollector';
import { installTransform } from './transform';
import { raceAgainstTimeout } from './util';
import { spec } from './spec';
import { ParameterRegistration, parameterRegistrations } from './fixtures';
export { Reporter } from './reporter';
export { RunnerConfig } from './runnerConfig';
export { Suite, Test, TestResult, Configuration } from './test';
import { isMatch } from 'micromatch';

const removeFolderAsync = promisify(rimraf);

type RunResult = 'passed' | 'failed' | 'forbid-only' | 'no-tests';

export class Runner {
  private _suites: Suite[] = [];
  private _config: RunnerConfig;
  private _reporter: Reporter;
  private _beforeFunctions: Function[] = [];
  private _afterFunctions: Function[] = [];
  private _parameterValues: Matrix = {};
  private _rootSuite: Suite;

  constructor(config: RunnerConfig, reporter: Reporter) {
    this._config = config;
    this._reporter = reporter;
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

  loadFiles(testDir: string, filters: string[], testMatch: string, testIgnore: string): {success: boolean} {
    let files: string[];
    try {
      files = collectFiles(testDir, '', filters, testMatch, testIgnore);
    } catch (error) {
      this._reporter.onParseError(testDir, error.message);
      return {success: false};
    }

    // First traverse tests.
    for (const file of files) {
      const suite = new Suite('');
      const revertBabelRequire = spec(suite, file, this._config.timeout, undefined);
      try {
        require(file);
      } catch (error) {
        revertBabelRequire();
        this._reporter.onParseError(file, serializeError(error));
        return {success: false};
      }
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
      hasSetup = fs.statSync(path.join(this._config.testDir, 'setup.js')).isFile();
    } catch (e) {
    }
    try {
      hasSetup = hasSetup || fs.statSync(path.join(this._config.testDir, 'setup.ts')).isFile();
    } catch (e) {
    }
    if (hasSetup) {
      global['setParameterValue'] = this.setParameterValue.bind(this);
      global['setParameterValues'] = this.setParameterValues.bind(this);
      global['before'] = (fn: Function) => this._beforeFunctions.push(fn);
      global['after'] = (fn: Function) => this._afterFunctions.push(fn);
      const setupPath = path.join(this._config.testDir, 'setup');
      try {
        require(setupPath);
      } catch (error) {
        revertBabelRequire();
        this._reporter.onParseError(setupPath, serializeError(error));
        return {success: false};
      }
    }
    revertBabelRequire();
    return {success: true};
  }

  async run(): Promise<RunResult> {
    if (!this._config.trialRun) {
      await removeFolderAsync(this._config.outputDir).catch(e => {});
      fs.mkdirSync(this._config.outputDir, { recursive: true });
    }

    const {suite, parseError} = parseTests(this._suites, this._parameterValues, this._config);
    if (parseError) {
      this._reporter.onParseError(parseError.file, serializeError(parseError.error));
      return 'failed';
    }

    this._rootSuite = suite;
    if (this._config.forbidOnly) {
      const hasOnly = this._rootSuite.findTest(t => t._only) || this._rootSuite.eachSuite(s => s._only);
      if (hasOnly)
        return 'forbid-only';
    }

    const total = this._rootSuite.total();
    if (!total)
      return 'no-tests';
    const { result, timedOut } = await raceAgainstTimeout(this._runTests(this._rootSuite), this._config.globalTimeout);
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
    return suite.findTest(test => !test.ok()) ? 'failed' : 'passed';
  }
}

function collectFiles(testDir: string, dir: string, filters: string[], testMatch: string, testIgnore: string): string[] {
  const fullDir = path.join(testDir, dir);
  if (!fs.existsSync(fullDir))
    throw new Error(`${fullDir} does not exist`);
  if (fs.statSync(fullDir).isFile())
    return [fullDir];
  const files = [];
  for (const name of fs.readdirSync(fullDir)) {
    const relativeName = path.join(dir, name);
    if (testIgnore && isMatch(relativeName, testIgnore))
      continue;
    if (fs.lstatSync(path.join(fullDir, name)).isDirectory()) {
      files.push(...collectFiles(testDir, path.join(dir, name), filters, testMatch, testIgnore));
      continue;
    }
    if (testIgnore && !isMatch(relativeName, testMatch))
      continue;
    const fullName = path.join(testDir, relativeName);
    if (!filters.length) {
      files.push(fullName);
      continue;
    }
    for (const filter of filters) {
      if (relativeName.includes(filter)) {
        files.push(fullName);
        break;
      }
    }
  }
  return files;
}
