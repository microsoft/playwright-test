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

import {TypeOnlyTestState, TypeOnlyWorkerState} from 'playwright-runner';
import { expect, fixtures as fixtureImported} from '@playwright/test-runner';

const fixtures = fixtureImported.extend<TypeOnlyWorkerState, TypeOnlyTestState>();

fixtures.registerFixture('page', async ({context, outputFile}, runTest, info) => {
  const page = await context.newPage();
  await runTest(page);
  const {result} = info;
  if (result.status === 'failed' || result.status === 'timedOut') {
    const assetPath = await outputFile('failed.png');
    await page.screenshot({path: assetPath});
  }
  await page.close();
});

const it = fixtures.it;

it('is a basic test with the page', async ({page}) => {
  await page.setContent(`<div style="height: 500px; background-color: red">
    The red background is real!
  </div>`);
  expect(await page.innerText('body')).toBe('Nooo!');
});