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

const { registerFixture } = require('../../');

registerFixture('foobar', async ({ }, runTest) => {
  await runTest(1);
});

registerFixture('foobar', async ({ foobar }, runTest) => {
  expect(foobar).toBe(1);
  await runTest(foobar + 1);
});

registerFixture('foobar', async ({ foobar }, runTest) => {
  expect(foobar).toBe(2);
  await runTest(foobar + 1);
});

it('assert foobar fixture value first time', async ({ foobar }) => {
  expect(foobar).toBe(3);
});

it('assert foobar fixture value second time', async ({ foobar }) => {
  expect(foobar).toBe(3);
});