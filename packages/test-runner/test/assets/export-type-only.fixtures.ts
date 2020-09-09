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

import { fixtures as baseFixtures } from '../..';

export type TypeOnlyTestState = {
  testTypeOnly: string;
};
export type TypeOnlyWorkerState = {
  workerTypeOnly: number;
};

const { registerFixture, registerWorkerFixture } = baseFixtures.extend<TypeOnlyWorkerState, TypeOnlyTestState>();

registerFixture('testTypeOnly', async ({config}, runTest, info) => {
  await runTest('testTypeOnly');
});

registerWorkerFixture('workerTypeOnly', async ({parallelIndex}, runTest, info) => {
  await runTest(42);
});
