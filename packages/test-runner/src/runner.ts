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
import rimraf from 'rimraf';
import { promisify } from 'util';
import { Dispatcher } from './dispatcher';
import './expect';
import { matrix, ParameterRegistration, parameterRegistrations, setParameterValues } from './fixtures';
import { Reporter } from './reporter';
import { RunnerConfig } from './runnerConfig';
import { declarationSpec } from './spec';
import { serializeError } from './test';
import { generateTests } from './testGenerator';
import { raceAgainstTimeout } from './util';
import { SuiteDeclaration } from './declarations';
export { Reporter } from './reporter';
export { RunnerConfig } from './runnerConfig';
export { Configuration, Suite, Test, TestResult } from './test';

const removeFolderAsync = promisify(rimraf);

type RunResult = 'passed' | 'failed' | 'forbid-only' | 'no-tests';

export class Runner {
  private _config: RunnerConfig;
  private _reporter: Reporter;
  private _beforeFunctions: Function[] = [];
  private _afterFunctions: Function[] = [];
  private _rootSuite: SuiteDeclaration;
  private _hasBadFiles = false;
  private _suites: SuiteDeclaration[] = [];

  constructor(config: RunnerConfig, reporter: Reporter) {
    this._config = config;
    this._reporter = reporter;
  }

  parameters(): ParameterRegistration[] {
    return [...parameterRegistrations.values()];
  }

  setParameterValue(name: string, value: string) {
    setParameterValues(name, [value]);
  }

  loadFiles(files: string[]) {
    // First traverse tests.
    for (const file of files) {
      const suite = new SuiteDeclaration('');
      suite.file = file;
      const revertBabelRequire = declarationSpec(suite);
      try {
        require(file);
        this._suites.push(suite);
      } catch (error) {
        this._reporter.onFileError(file, serializeError(error));
        this._hasBadFiles = true;
      } finally {
        revertBabelRequire();
      }
    }

    // Set default values
    for (const param of this.parameters()) {
      if (!(param.name in matrix))
        this.setParameterValue(param.name, param.defaultValue);
    }
  }

  async run(): Promise<RunResult> {
    if (!this._config.trialRun) {
      await removeFolderAsync(this._config.outputDir).catch(e => {});
      fs.mkdirSync(this._config.outputDir, { recursive: true });
    }

    // We can only generate tests after parameters have been assigned.
    this._rootSuite = generateTests(this._suites, this._config);

    if (this._config.forbidOnly) {
      const hasOnly = this._rootSuite.findTest(t => t._only) || this._rootSuite.findSuite(s => s._only);
      if (hasOnly)
        return 'forbid-only';
    }

    const total = this._rootSuite.total();
    if (!total && !this._hasBadFiles)
      return 'no-tests';
    const { result, timedOut } = await raceAgainstTimeout(this._runTests(this._rootSuite), this._config.globalTimeout);
    if (timedOut) {
      this._reporter.onTimeout(this._config.globalTimeout);
      process.exit(1);
    }
    return result;
  }

  private async _runTests(suite: SuiteDeclaration): Promise<RunResult> {
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
    return this._hasBadFiles || suite.findTest(test => !test._ok()) ? 'failed' : 'passed';
  }
}
