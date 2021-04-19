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

import { ChromiumEnv, FirefoxEnv, WebKitEnv, PlaywrightOptions, test, setConfig } from '@playwright/test';

// Global Folio configuration.
setConfig({
  testDir: __dirname, // Search for tests in this directory.
  timeout: 30000, // Each test is given 30 seconds.
});

// Playwright-specific options for browser environments.
const options: PlaywrightOptions = {
  headless: true, // Run tests in headless browsers.
  viewport: { width: 1280, height: 720 },
  screenshot: 'only-on-failure',
};

// Run tests in three browsers.
test.runWith(new ChromiumEnv(options), { tag: 'chromium' });
test.runWith(new FirefoxEnv(options), { tag: 'firefox' });
test.runWith(new WebKitEnv(options), { tag: 'webkit' });
