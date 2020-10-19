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

import { folio as baseFolio } from '@playwright/test';
export { expect } from '@playwright/test';

const builder = baseFolio.extend<{}, { loggedInState: any }>();

builder.loggedInState.init(async ({ browser }, run) => {
  // Create a new page.
  const page = await browser.newPage();
  // Perform real log in.
  await page.goto('https://www.microsoft.com/en-us/');
  await page.click('a[aria-label="Sign in to your account"]');
  await page.fill('input[aria-label="Enter your email, phone, or Skype."]', process.env.SECRET_USERNAME);
  await page.click('input[type="submit"]');
  await page.fill(`input[aria-label="Enter the password for ${process.env.SECRET_USERNAME}"]`, process.env.SECRET_PASSWORD);
  await page.click('input[type="submit"]');
  await page.check('input[aria-label="Don\'t show this again"]');
  await Promise.all([
    page.waitForNavigation({ url: 'https://www.microsoft.com/en-us/?wa=wsignin1.0' }),
    page.click('input[type="submit"]')
  ]);

  // Fetch cookies.
  const cookies = await (await page.context().cookies()).filter(c => c.value !== '');
  // Fetch local and session storage.
  const storage = await page.evaluate(() => ({ sessionStorage, localStorage }));
  // Close the login page, we no longer need it.
  await page.close();

  // Run the test with the loggedInState.
  const loggedInState = { ...storage, cookies };
  await run(loggedInState);
}, { scope: 'worker' });

builder.context.override(async ({ context, loggedInState }, run) => {
  // Override context to inject cookies, local and session storage.
  await context.addCookies(loggedInState.cookies);
  await context.addInitScript(loggedInState => {
    if (new URL(location.href).origin.endsWith('microsoft.com')) {
      for (const name of Object.keys(loggedInState.session))
        sessionStorage[name] = loggedInState.sessionStorage[name];
      for (const name of Object.keys(loggedInState.local))
        localStorage[name] = loggedInState.localStorage[name];
    }
  }, loggedInState);
  await run(context);
});

export const folio = builder.build();
export const it = folio.it;
