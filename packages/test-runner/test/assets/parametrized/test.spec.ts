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

import { fixtures as baseFixtures } from '../../..';

const fixtures = baseFixtures.declareParameters<{ foo: string, bar: string }>();
fixtures.defineParameter('foo', 'Foo parameters', 'foo');
fixtures.defineParameter('bar', 'Bar parameters', 'bar');

const { it, expect } = fixtures;

it('runs 6 times', (test, parameters) => {
  test.skip(parameters.foo === 'foo1' && parameters.bar === 'bar1');
}, async ({ foo, bar }) => {
  expect(foo).toContain('foo');
  expect(bar).toContain('bar');
});
