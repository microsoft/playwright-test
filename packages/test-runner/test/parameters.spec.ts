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

it('should run with each configuration', async ({ runInlineFixturesTest }) => {
  const result = await runInlineFixturesTest({
    'a.test.ts': `
      const fixtures = baseFixtures.declareParameters<{ foo: string, bar: string }>();
      fixtures.defineParameter('foo', 'Foo parameters', 'foo');
      fixtures.defineParameter('bar', 'Bar parameters', 'bar');
      fixtures.generateParametrizedTests('foo', ['foo1', 'foo2', 'foo3']);
      fixtures.generateParametrizedTests('bar', ['bar1', 'bar2']);

      const { it, expect } = fixtures;

      it('runs 6 times', (test, parameters) => {
        test.skip(parameters.foo === 'foo1' && parameters.bar === 'bar1');
      }, async ({ foo, bar }) => {
        expect(foo).toContain('foo');
        expect(bar).toContain('bar');
        console.log(foo + ':' + bar);
      });
    `
  });

  expect(result.exitCode).toBe(0);
  expect(result.passed).toBe(5);  // 6 total, one skipped
  const configurations = result.report.suites[0].tests[0].runs.map(r => r.configuration);
  const objects: any[] = configurations.map(c => {
    const object = {};
    for (const { name, value } of c)
      object[name] = value;
    return object;
  });
  for (const foo of ['foo1', 'foo2', 'foo3']) {
    for (const bar of ['bar1', 'bar2']) {
      expect(objects.find(o => o.foo === foo && o.bar === bar)).toBeTruthy();
      if (foo !== 'foo1' && bar !== 'bar1')
        expect(result.output).toContain(`${foo}:${bar}`);
    }
  }
});

it('should fail on invalid parameters', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.spec.ts': `
      fixtures.generateParametrizedTests('invalid', ['value']);

      it('success', async ({}) => {
      });
    `
  });
  expect(result.exitCode).toBe(1);
  expect(result.output).toContain('a.spec.ts');
  expect(result.output).toContain(`Unregistered parameter 'invalid' was set.`);
});
