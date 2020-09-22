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

import { Parameters, TestRun } from './ipc';

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

export class Spec extends Base {
  fn: Function;
  tests: Test[] = [];

  constructor(title: string, fn: Function, suite: Suite) {
    super(title, suite);
    this.fn = fn;
    suite._addSpec(this);
  }

  _ok(): boolean {
    return !this.tests.find(r => !r.ok());
  }
}

export class Suite extends Base {
  suites: Suite[] = [];
  specs: Spec[] = [];
  _entries: (Suite | Spec)[] = [];

  constructor(title: string, parent?: Suite) {
    super(title, parent);
    if (parent)
      parent._addSuite(this);
  }

  total(): number {
    let count = 0;
    this.findSpec(test => {
      count += test.tests.length;
    });
    return count;
  }

  _addSpec(spec: Spec) {
    spec.parent = this;
    this.specs.push(spec);
    this._entries.push(spec);
  }

  _addSuite(suite: Suite) {
    suite.parent = this;
    this.suites.push(suite);
    this._entries.push(suite);
  }

  findSpec(fn: (test: Spec) => boolean | void): boolean {
    for (const suite of this.suites) {
      if (suite.findSpec(fn))
        return true;
    }
    for (const test of this.specs) {
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

  _allSpecs(): Spec[] {
    const result: Spec[] = [];
    this.findSpec(test => { result.push(test); });
    return result;
  }

  _renumber() {
    // All tests are identified with their ordinals.
    let ordinal = 0;
    this.findSpec((test: Spec) => {
      test._ordinal = ordinal++;
    });
  }
}

export class Test {
  spec: Spec;
  parameters: Parameters;
  runs: TestRun[] = [];

  constructor(spec: Spec) {
    this.spec = spec;
  }

  _appendTestRun(): TestRun {
    const result: TestRun = {
      skipped: false,
      flaky: false,
      slow: false,
      expectedStatus: 'passed',
      timeout: 0,
      workerId: 0,
      annotations: [],

      duration: 0,
      stdout: [],
      stderr: [],
      data: {}
    };
    this.runs.push(result);
    return result;
  }

  ok(): boolean {
    let hasPassedResults = false;
    for (const result of this.runs) {
      if (result.status === 'skipped')
        return true;
      if (!result.flaky && result.status !== result.expectedStatus)
        return false;
      if (result.status === result.expectedStatus)
        hasPassedResults = true;
    }
    return hasPassedResults;
  }
}
