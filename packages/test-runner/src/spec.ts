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

import { Test, Suite } from './test';
import { installTransform } from './transform';

Error.stackTraceLimit = 15;

let currentItImpl;
let currentDescribeImpl;
let currentSuites: Suite[];

interface DescribeFunction {
  describe(name: string, inner: () => void): void;
  describe(name: string, modifier: (suite: Suite) => any, inner: () => void): void;
}

interface ItFunction<STATE> {
  it(name: string, inner: (state: STATE) => Promise<void> | void): void;
  it(name: string, modifier: (test: Test) => any, inner: (state: STATE) => Promise<void> | void): void;
}

export const it: ItFunction<TestState & WorkerState>['it'] & {
  only: ItFunction<TestState & WorkerState>['it'];
  skip: ItFunction<TestState & WorkerState>['it'];
} = (...args) => {
  currentItImpl('default', ...args);
};
it.skip = (...args) => currentItImpl('skip', ...args);
it.only = (...args) => currentItImpl('only', ...args);
export const fit: ItFunction<TestState & WorkerState>['it'] = it.only;
export const xit: ItFunction<TestState & WorkerState>['it'] = it.skip;

export const describe: DescribeFunction['describe'] & {
  only: DescribeFunction['describe'];
  skip: DescribeFunction['describe'];
} = (...args) => {
  currentDescribeImpl('default', ...args);
};
describe.skip = (...args) => currentDescribeImpl('skip', ...args);
describe.only = (...args) => currentDescribeImpl('only', ...args);
export const fdescribe: DescribeFunction['describe'] = describe.only;
export const xdescribe: DescribeFunction['describe'] = describe.skip;

export const beforeEach: (inner: (state: TestState & WorkerState) => Promise<void>) => void = fn => currentSuites[0]._addHook('beforeEach', fn);
export const afterEach: (inner: (state: TestState & WorkerState) => Promise<void>) => void = fn => currentSuites[0]._addHook('afterEach', fn);
export const beforeAll: (inner: (state: WorkerState) => Promise<void>) => void = fn => currentSuites[0]._addHook('beforeAll', fn);
export const afterAll: (inner: (state: WorkerState) => Promise<void>) => void = fn => currentSuites[0]._addHook('afterAll', fn);

export function spec(suite: Suite, file: string, timeout: number): () => void {
  const suites = [suite];
  currentSuites = suites;
  suite.file = file;

  currentItImpl = (spec: 'default' | 'skip' | 'only', title: string, metaFn: (test: Test) => void | Function, fn?: Function) => {
    const suite = suites[0];
    if (typeof fn !== 'function') {
      fn = metaFn;
      metaFn = null;
    }
    const test = new Test(title, fn);
    if (metaFn)
      metaFn(test);
    test.file = file;
    test.location = extractLocation(new Error());
    test._timeout = timeout;
    if (spec === 'only')
      test._only = true;
    if (spec === 'skip')
      test._skipped = true;
    suite._addTest(test);
    return test;
  };

  currentDescribeImpl = (spec: 'describe' | 'skip' | 'only', title: string, metaFn: (suite: Suite) => void | Function, fn?: Function) => {
    if (typeof fn !== 'function') {
      fn = metaFn;
      metaFn = null;
    }
    const child = new Suite(title, suites[0]);
    if (metaFn)
      metaFn(child);
    suites[0]._addSuite(child);
    child.file = file;
    child.location = extractLocation(new Error());
    if (spec === 'only')
      child._only = true;
    if (spec === 'skip')
      child._skipped = true;
    suites.unshift(child);
    fn();
    suites.shift();
  };

  return installTransform();
}

function extractLocation(error: Error): string {
  const location = error.stack.split('\n')[3];
  const match = location.match(/Object.<anonymous> \((.*)\)/);
  if (match)
    return match[1];
  return '';
}
