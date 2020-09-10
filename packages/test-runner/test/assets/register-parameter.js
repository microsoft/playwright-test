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

const { fixtures } = require('../..');
const { it, expect, registerParameter, registerWorkerFixture } = fixtures;

registerParameter('param1', 'Custom parameter 1');
registerParameter('param2', 'Custom parameter 2', 'value2');

registerWorkerFixture('param1', async ({}, runTest) => {
  await runTest('');
});

registerWorkerFixture('param2', async ({}, runTest) => {
  await runTest('');
});

it('pass', async ({ param1, param2 }) => {
  expect(param1).toBe('value1');
  expect(param2).toBe('value2');
});
