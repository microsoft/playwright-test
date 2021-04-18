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

import { BrowserContext } from 'playwright';
import { ChromiumEnv, FirefoxEnv, WebKitEnv, PlaywrightOptions, setConfig, newTestType, merge } from '@playwright/test';

// Global Folio configuration.
setConfig({
  testDir: __dirname,
  timeout: 30000,
});

// New test type that provides a number in addition to standard page, context, etc.
export const test = newTestType<{ loginOnce: (context: BrowserContext) => Promise<BrowserContext> }>();
export { expect } from '@playwright/test';

let loggedInState: any;

async function loginOnce(context: BrowserContext) {
  if (loggedInState) return overrideContext(context, loggedInState);

  const page = await context.newPage();

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
    page.click('input[type="submit"]'),
  ]);

  const cookies = (await page.context().cookies()).filter(c => c.value !== '');
  const storage = await page.evaluate(() => ({ sessionStorage, localStorage }));
  await page.close();

  loggedInState = { ...storage, cookies };

  return overrideContext(context, loggedInState);
}

async function overrideContext(context: BrowserContext, loggedInState: any): Promise<BrowserContext> {
  await context.addCookies(loggedInState.cookies);
  await context.addInitScript((loggedInState: any) => {
    if (new URL(location.href).origin.endsWith('microsoft.com')) {
      for (const name of Object.keys(loggedInState.session))
        sessionStorage[name] = loggedInState.sessionStorage[name];
      for (const name of Object.keys(loggedInState.local))
        localStorage[name] = loggedInState.localStorage[name];
    }
  }, loggedInState);
  return context;
}

// Custom environment
class LoggedInEnv {
  beforeEach() {
    return {
      loginOnce,
    };
  }
}

// Playwright-specific options for browser environments.
const options: PlaywrightOptions = {
  headless: true,
  viewport: { width: 1280, height: 720 },
};

// Run tests in three browsers, with custom and browser environments.
test.runWith(merge(new LoggedInEnv(), new ChromiumEnv(options)), { tag: 'chromium' });
test.runWith(merge(new LoggedInEnv(), new FirefoxEnv(options)), { tag: 'firefox' });
test.runWith(merge(new LoggedInEnv(), new WebKitEnv(options)), { tag: 'webkit' });
