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
const { it, expect, registerFixture, parameters } = baseFixtures.extend<{ foo: string, bar: string }>();

registerFixture('foo', async ({}, runTest) => {
  await runTest('default');
});

registerFixture('bar', async ({}, runTest) => {
  await runTest('default');
});

it('runs 6 times', async ({ foo, bar }) => {
  expect(foo).toContain('foo');
  expect(bar).toContain('bar');
  expect(parameters.foo).toBe(foo);
  expect(parameters.bar).toBe(bar);
});
