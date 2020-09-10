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

import { fixtures } from './fixtures';
const { it, expect } = fixtures;

it('should run with each configuration', async ({ runTest }) => {
  const result = await runTest('parametrized');
  expect(result.exitCode).toBe(0);
  expect(result.passed).toBe(6);
  const configurations = result.report.suites.map(s => s.configuration);
  const objects = configurations.map(c => {
    const object = {};
    for (const { name, value } of c)
      object[name] = value;
    return object;
  });
  for (const foo of ['foo1', 'foo2', 'foo3']) {
    for (const bar of ['bar1', 'bar2'])
      expect(objects.find(o => o.foo === foo && o.bar === bar)).toBeTruthy();
  }
});
