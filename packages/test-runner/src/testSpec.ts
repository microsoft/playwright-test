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

import { Configuration, TestResult, TestStatus } from "./ipc";

export class Spec {
  title: string;
  file: string;
  location: string;
  parent?: SuiteSpec;

  _only = false;
  _skipped = false;

  _ordinal: number;

  constructor(title: string, parent?: SuiteSpec) {
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

export class TestSpec extends Spec {
  fn: Function;
  runs: Test[] = [];

  constructor(title: string, fn: Function, suite: SuiteSpec) {
    super(title, suite);
    this.title = title;
    this.fn = fn;
    suite._addTest(this);
  }

  _ok(): boolean {
    return !this.runs.find(r => !r.ok());
  }
}

export class SuiteSpec extends Spec {
  suites: SuiteSpec[] = [];
  tests: TestSpec[] = [];
  _entries: (SuiteSpec | TestSpec)[] = [];

  constructor(title: string, parent?: SuiteSpec) {
    super(title, parent);
    if (parent)
      parent._addSuite(this);
  }

  total(): number {
    let count = 0;
    this.findTest(fn => {
      ++count;
    });
    return count;
  }

  _addTest(test: TestSpec) {
    test.parent = this;
    this.tests.push(test);
    this._entries.push(test);
  }

  _addSuite(suite: SuiteSpec) {
    suite.parent = this;
    this.suites.push(suite);
    this._entries.push(suite);
  }

  findTest(fn: (test: TestSpec) => boolean | void): boolean {
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

  findSuite(fn: (suite: SuiteSpec) => boolean | void): boolean {
    if (fn(this))
      return true;
    for (const suite of this.suites) {
      if (suite.findSuite(fn))
        return true;
    }
    return false;
  }

  _allTests(): TestSpec[] {
    const result: TestSpec[] = [];
    this.findTest(test => { result.push(test); });
    return result;
  }

  _renumber() {
    // All tests and suites are identified with their ordinals.
    let ordinal = 0;
    this.findSuite((suite: SuiteSpec) => {
      suite._ordinal = ordinal++;
    });

    ordinal = 0;
    this.findTest((test: TestSpec) => {
      test._ordinal = ordinal++;
    });
  }

  _assignIds() {
    this.findTest((test: TestSpec) => {
      for (const run of test.runs)
        run._id = `${test._ordinal}@${run.spec.file}::[${run._configurationString}]`;
    });
  }
}

export class Test {
  spec: TestSpec;
  skipped: boolean;
  flaky: boolean;
  only: boolean;
  slow: boolean;
  expectedStatus: TestStatus;
  timeout: number;
  workerId: number;
  annotations: any[];

  configuration: Configuration;
  results: TestResult[] = [];

  _configurationString: string;
  _workerHash: string;
  _id: string;

  constructor(spec: TestSpec) {
    this.spec = spec;
  }

  _appendResult(): TestResult {
    const result: TestResult = {
      duration: 0,
      stdout: [],
      stderr: [],
      data: {}
    };
    this.results.push(result);
    return result;
  }

  ok(): boolean {
    if (this.skipped)
      return true;
    const hasFailedResults = !!this.results.find(r => r.status !== this.expectedStatus);
    if (!hasFailedResults)
      return true;
    if (!this.flaky)
      return false;
    const hasPassedResults = !!this.results.find(r => r.status === this.expectedStatus);
    return hasPassedResults;
  }
}
