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

import {registerWorkerFixture} from 'playwright-runner';
import playwright from 'playwright';

declare global {
  interface FixtureParameters {
    deviceName: string;
  }
}

registerWorkerFixture('deviceName', async ({}, test) => {
  await test(null);
});

registerWorkerFixture('defaultContextOptions', async ({deviceName}, test) => {
  const device = typeof deviceName === 'string' ? playwright.devices[deviceName] : deviceName;
  await test({
    ...device
  });
});

it('is a basic test with the page', async ({page}) => {
  await page.goto('http://whatsmyuseragent.org/');
});