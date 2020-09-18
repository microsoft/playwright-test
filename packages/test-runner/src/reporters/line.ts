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

import * as path from 'path';
import { RunnerConfig } from '../runnerConfig';
import { BaseReporter } from './base';
import { SuiteSpec, TestResult, TestRun } from '../testSpec';

class LineReporter extends BaseReporter {
  private _total: number;
  private _current = 0;
  private _failures = 0;

  onBegin(config: RunnerConfig, suite: SuiteSpec) {
    super.onBegin(config, suite);
    this._total = suite.total();
    console.log();
  }

  onTestEnd(test: TestRun, result: TestResult) {
    super.onTestEnd(test, result);
    const declaration = test.declaration;
    const baseName = path.basename(declaration.file);
    const title = `${baseName} - ${declaration.fullTitle()}`;
    process.stdout.write(`\u001B[1A\u001B[2K[${++this._current}/${this._total}] ${title}\n`);
    if (!test.ok()) {
      process.stdout.write(`\u001B[1A\u001B[2K`);
      console.log(super.formatFailure(test, ++this._failures));
      console.log();
    }
  }

  onEnd() {
    super.onEnd();
    console.log('');
    this.printSlowTests();
  }
}

export default LineReporter;
