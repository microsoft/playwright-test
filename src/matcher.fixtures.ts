/**
 * Copyright Microsoft Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { fixtures as baseFixtures } from '@playwright/test-runner';
import { config, TestInfo } from '@playwright/test-runner';
import expectLibrary from 'expect';
import * as path from 'path';
import { compare } from './golden';

type MatcherParameters = {
  // Directory where the golden snapshots are located. Defaults to __snapshots__
  snapshotDir: string;

  // Whether to overwrite all the snapshots with the actual ones. Defaults to false.
  updateSnapshots: boolean;
};

type MatcherTestFixtures = {
  // Automatically installs image matcher.
  expectToMatchImage: undefined;
};

const fixtures = baseFixtures
    .declareParameters<MatcherParameters>()
    .declareTestFixtures<MatcherTestFixtures>();

// Parameter and matrix definitions --------------------------------------------

fixtures.defineParameter('snapshotDir', 'Snapshot directory, relative to tests directory', '__snapshots__');
fixtures.defineParameter('updateSnapshots', 'Whether to update snapshots', false);

export const expect = expectLibrary;

declare module 'expect/build/types' {
  interface Matchers<R> {
    toMatchImage(path: string, options?: { threshold?: number  }): R;
  }
}

let state: {
  testInfo: TestInfo;
  snapshotDir: string;
  updateSnapshots: boolean;
};

fixtures.defineTestFixture('expectToMatchImage',  async ({ testInfo, snapshotDir, updateSnapshots }, runTest) => {
  state = { testInfo, snapshotDir, updateSnapshots };
  await runTest(undefined);
}, { auto: true });

function toMatchImage(received: Buffer, name: string, options?: { threshold?: number }) {
  const { pass, message } = compare(received, name, state.testInfo, path.join(config.testDir, state.snapshotDir), state.updateSnapshots, options);
  return { pass, message: () => message };
}
expect.extend({ toMatchImage });
