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

const kConfigFile = `import { ChromiumEnv, FirefoxEnv, WebKitEnv, PlaywrightOptions, test, setConfig } from '@playwright/test';

// Global configuration.
setConfig({
  // Search for tests.
  testDir: __dirname,
  timeout: 30000,
});

// Playwright options for browser environments.
const options: PlaywrightOptions = {
  headless: true,
  viewport: { width: 1280, height: 720 },
};

// Run tests in three browsers.
test.runWith(new ChromiumEnv(options), { tag: 'chromium' });
test.runWith(new FirefoxEnv(options), { tag: 'firefox' });
test.runWith(new WebKitEnv(options), { tag: 'webkit' });
`;

const kTestFile = `import { test, expect } from '@playwright/test';

test('check page title', async ({ page }) => {
  await page.setContent('<title>My Page</title><body>Hello</body>');
  expect(await page.title()).toBe('My Page');
});
`;

export const project = {
  configFile: 'config.ts',
  files: {
    'config.ts': kConfigFile,
    'title.spec.ts': kTestFile,
  },
};
