/**
 * Copyright Microsoft Corporation. All rights reserved.
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

import { Parameters, TestResult, TestStatus } from "./ipc";

class Base {
  title: string;
  file: string;
  location: string;
  parent?: Suite;

  _only = false;
  _ordinal: number;

  constructor(title: string, parent?: Suite) {
    this.title = title;
    this.parent = parent;
  }

  titlePath(): string[] {
    if (!this.parent)
      return [];
    if (!this.title)
      return this.parent.titlePath();
    return [...this.parent.titlePath(), this.title];
  }

  fullTitle(): string {
    return this.titlePath().join(' ');
  }
}

export class Test extends Base {
  fn: Function;
  variants: TestVariant[] = [];

  constructor(title: string, fn: Function, suite: Suite) {
    super(title, suite);
    this.fn = fn;
    suite._addTest(this);
  }

  _ok(): boolean {
    return !this.variants.find(r => !r.ok());
  }
}

export class Suite extends Base {
  suites: Suite[] = [];
  tests: Test[] = [];
  _entries: (Suite | Test)[] = [];

  constructor(title: string, parent?: Suite) {
    super(title, parent);
    if (parent)
      parent._addSuite(this);
  }

  total(): number {
    let count = 0;
    this.findTest(test => {
      count += test.variants.length;
    });
    return count;
  }

  _addTest(test: Test) {
    test.parent = this;
    this.tests.push(test);
    this._entries.push(test);
  }

  _addSuite(suite: Suite) {
    suite.parent = this;
    this.suites.push(suite);
    this._entries.push(suite);
  }

  findTest(fn: (test: Test) => boolean | void): boolean {
    for (const suite of this.suites) {
      if (suite.findTest(fn))
        return true;
    }
    for (const test of this.tests) {
      if (fn(test))
        return true;
    }
    return false;
  }

  findSuite(fn: (suite: Suite) => boolean | void): boolean {
    if (fn(this))
      return true;
    for (const suite of this.suites) {
      if (suite.findSuite(fn))
        return true;
    }
    return false;
  }

  _allTests(): Test[] {
    const result: Test[] = [];
    this.findTest(test => { result.push(test); });
    return result;
  }

  _renumber() {
    // All tests are identified with their ordinals.
    let ordinal = 0;
    this.findTest((test: Test) => {
      test._ordinal = ordinal++;
    });
  }
}

export class TestVariant {
  spec: Test;
  skipped: boolean;
  flaky: boolean;
  only: boolean;
  slow: boolean;
  expectedStatus: TestStatus;
  timeout: number;
  workerId: number;
  annotations: any[];

  parameters: Parameters;
  runs: TestResult[] = [];

  constructor(spec: Test) {
    this.spec = spec;
  }

  _appendResult(): TestResult {
    const result: TestResult = {
      duration: 0,
      stdout: [],
      stderr: [],
      data: {}
    };
    this.runs.push(result);
    return result;
  }

  ok(): boolean {
    if (this.skipped)
      return true;
    const hasFailedResults = !!this.runs.find(r => r.status !== this.expectedStatus);
    if (!hasFailedResults)
      return true;
    if (!this.flaky)
      return false;
    const hasPassedResults = !!this.runs.find(r => r.status === this.expectedStatus);
    return hasPassedResults;
  }
}
