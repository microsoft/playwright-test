/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { RunnerConfig } from '../runnerConfig';
import { Reporter } from '../reporter';
import { Suite, TestVariant } from '../test';
import { TestResult } from '../ipc';

export class Multiplexer implements Reporter {
  private _reporters: Reporter[];

  constructor(reporters: Reporter[]) {
    this._reporters = reporters;
  }

  onBegin(config: RunnerConfig, suite: Suite) {
    for (const reporter of this._reporters)
      reporter.onBegin(config, suite);
  }

  onTestBegin(test: TestVariant) {
    for (const reporter of this._reporters)
      reporter.onTestBegin(test);
  }

  onTestStdOut(test: TestVariant, chunk: string | Buffer) {
    for (const reporter of this._reporters)
      reporter.onTestStdOut(test, chunk);
  }

  onTestStdErr(test: TestVariant, chunk: string | Buffer) {
    for (const reporter of this._reporters)
      reporter.onTestStdErr(test, chunk);
  }

  onTestEnd(test: TestVariant, result: TestResult) {
    for (const reporter of this._reporters)
      reporter.onTestEnd(test, result);
  }

  onTimeout(timeout: number) {
    for (const reporter of this._reporters)
      reporter.onTimeout(timeout);
  }

  onEnd() {
    for (const reporter of this._reporters)
      reporter.onEnd();
  }

  onFileError(file: string, error: any) {
    for (const reporter of this._reporters)
      reporter.onFileError(file, error);
  }
}
