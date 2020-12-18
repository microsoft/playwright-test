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

import { it, expect } from '@playwright/test';

// Run this test with the '--param screenshotOnFailure' command line parameter
// or 'npm run test'.

it('is a basic test with the page', async ({ page, browserName, testInfo }) => {
  await page.setContent(`<div style="height: 500px; background-color: red">
    This test's title is ${testInfo.title}<br>
    It is opening in ${browserName}!
  </div>`);
  expect(await page.innerText('body')).toBe('Nooo!');
});
