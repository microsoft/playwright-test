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

import { fixtures as imported } from '../..';

type WrapWorkerState = {
  workerWrap: number;
};
type WrapTestState = {
  testWrap: string;
};
export const fixtures = imported.extend<WrapWorkerState, WrapTestState>();

export const it = fixtures.it;
export const fit = fixtures.fit;
export const xit = fixtures.xit;
export const describe = fixtures.describe;
export const fdescribe = fixtures.fdescribe;
export const xdescribe = fixtures.xdescribe;
export const beforeEach = fixtures.beforeEach;
export const afterEach = fixtures.afterEach;
export const beforeAll = fixtures.beforeAll;
export const afterAll = fixtures.afterAll;
export const parameters = fixtures.parameters;
export const expect = fixtures.expect;

fixtures.registerFixture('testWrap', async ({config}, runTest, info) => {
  await runTest('testWrap');
});

fixtures.registerWorkerFixture('workerWrap', async ({parallelIndex}, runTest, info) => {
  await runTest(42);
});
