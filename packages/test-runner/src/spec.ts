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

export function spec(suite: Suite, file: string, timeout: number): () => void {
  const suites = [suite];
  suite.file = file;

  const it = (spec: 'default' | 'skip' | 'only', title: string, metaFn: (test: Test) => void | Function, fn?: Function) => {
    const suite = suites[0];
    if (typeof fn !== 'function') {
      fn = metaFn;
      metaFn = null;
    }
    const test = new Test(title, fn);
    if (metaFn)
      metaFn(test);
    test.file = file;
    test._timeout = timeout;
    if (spec === 'only')
      test._only = true;
    if (spec === 'skip')
      test._skipped = true;
    suite._addTest(test);
    return test;
  };

  const describe = (spec: 'describe' | 'skip' | 'only', title: string, metaFn: (suite: Suite) => void | Function, fn?: Function) => {
    if (typeof fn !== 'function') {
      fn = metaFn;
      metaFn = null;
    }
    const child = new Suite(title, suites[0]);
    if (metaFn)
      metaFn(child);
    suites[0]._addSuite(child);
    child.file = file;
    if (spec === 'only')
      child._only = true;
    if (spec === 'skip')
      child._skipped = true;
    suites.unshift(child);
    fn();
    suites.shift();
  }

  const context = (global as any);
  context.beforeEach = fn => suite._addHook('beforeEach', fn);
  context.afterEach = fn => suite._addHook('afterEach', fn);
  context.beforeAll = fn => suite._addHook('beforeAll', fn);
  context.afterAll = fn => suite._addHook('afterAll', fn);

  context.describe = describe.bind(null, 'default');
  context.fdescribe = describe.bind(null, 'only');
  context.xdescribe = describe.bind(null, 'skip');

  context.it = it.bind(null, 'default');
  context.fit = it.bind(null, 'only');
  context.xit = it.bind(null, 'skip');

  return installTransform();
}
