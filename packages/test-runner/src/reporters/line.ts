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

import { BaseReporter } from './base';
import { RunnerConfig } from '../runnerConfig';
import { Suite, Test, TestResult } from '../test';

class LineReporter extends BaseReporter {
  private _total: number;
  private _current = 0;
  private _failures = 0;

  onBegin(config: RunnerConfig, suite: Suite) {
    super.onBegin(config, suite);
    this._total = suite.total();
    console.log();
  }

  onTestBegin(test: Test) {
    super.onTestBegin(test);
    process.stdout.write(`\u001B[1A\u001B[2K[${++this._current}/${this._total}] ${test.fullTitle()}\n`);
  }

  onTestEnd(test: Test, result: TestResult) {
    super.onTestEnd(test, result);
    if (!test.ok()) {
      process.stdout.write(`\u001B[1A\u001B[2K`);
      console.log(super.formatFailure(test, ++this._failures));
      console.log();
    }
  }

  epilogue() {
  }
}

export default LineReporter;
