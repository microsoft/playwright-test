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

import colors from 'colors/safe';
import milliseconds from 'ms';
import { BaseReporter } from './base';
import { RunnerConfig } from '../runnerConfig';
import { Suite, Test, TestResult } from '../test';

class ListReporter extends BaseReporter {
  private _failure = 0;
  private _lastRow = 0;
  private _testRows = new Map<Test, number>();

  onBegin(config: RunnerConfig, suite: Suite) {
    super.onBegin(config, suite);
    console.log();
  }

  onTestBegin(test: Test) {
    super.onTestBegin(test);
    process.stdout.write('    ' + colors.gray(test.fullTitle() + ': ') + '\n');
    this._testRows.set(test, this._lastRow++);
  }

  onTestEnd(test: Test, result: TestResult) {
    super.onTestEnd(test, result);

    const duration = colors.dim(` (${milliseconds(test.duration())})`);
    let text = '';
    if (result.status === 'skipped') {
      text = colors.green('  - ') + colors.cyan(test.fullTitle());
    } else {
      const statusMark = result.status === 'passed' ? '  ✓ ' : '  x ';
      if (result.status === result.expectedStatus)
        text = '\u001b[2K\u001b[0G' + colors.green(statusMark) + colors.gray(test.fullTitle()) + duration;
      else
        text = '\u001b[2K\u001b[0G' + colors.red(`  ${++this._failure}) ` + test.fullTitle()) + duration;
    }

    const testRow = this._testRows.get(test);
    // Go up if needed
    if (testRow !== this._lastRow)
      process.stdout.write(`\u001B[${this._lastRow - testRow}A`);
    // Erase line
    process.stdout.write('\u001B[2K');
    process.stdout.write(text);
    // Go down if needed.
    if (testRow !== this._lastRow)
      process.stdout.write(`\u001B[${this._lastRow - testRow}E`);
  }

  onEnd() {
    super.onEnd();
    process.stdout.write('\n');
    this.epilogue();
  }
}

export default ListReporter;
