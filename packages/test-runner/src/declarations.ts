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

import { Test } from "./test";

export class Declaration {
  title: string;
  file: string;
  location: string;
  parent?: SuiteDeclaration;
  _ordinal: number;

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

export class TestDeclaration extends Declaration {
  fn: Function;
  runs: Test[] = [];

  constructor(title: string, fn: Function) {
    super();
    this.title = title;
    this.fn = fn;
  }
}

export class SuiteDeclaration extends Declaration {
  suites: SuiteDeclaration[] = [];
  tests: TestDeclaration[] = [];
 
  constructor(title: string, parent?: SuiteDeclaration) {
    super();
    this.title = title;
    this.parent = parent;
  }

  total(): number {
    let count = 0;
    this.findTest(fn => {
      ++count;
    });
    return count;
  }

  _addTest(test: TestDeclaration) {
    test.parent = this;
    this.tests.push(test);
  }

  _addSuite(suite: SuiteDeclaration) {
    suite.parent = this;
    this.suites.push(suite);
  }

  eachSuite(fn: (suite: SuiteDeclaration) => boolean | void): boolean {
    for (const suite of this.suites) {
      if (suite.eachSuite(fn))
        return true;
    }
    return false;
  }

  findTest(fn: (test: TestDeclaration) => boolean | void): boolean {
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

  findSuite(fn: (suite: SuiteDeclaration) => boolean | void): boolean {
    if (fn(this))
      return true;
    for (const suite of this.suites) {
      if (suite.findSuite(fn))
        return true;
    }
    return false;
  }

  _allTests(): TestDeclaration[] {
    const result: TestDeclaration[] = [];
    this.findTest(test => { result.push(test); });
    return result;
  }

  _renumber() {
    // All tests and suites are identified with their ordinals.
    let ordinal = 0;
    this.findSuite((suite: SuiteDeclaration) => {
      suite._ordinal = ordinal++;
    });

    ordinal = 0;
    this.findTest((test: TestDeclaration) => {
      test._ordinal = ordinal++;
    });
  }
}
