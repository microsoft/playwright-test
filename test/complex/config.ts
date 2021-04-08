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

import { ChromiumEnv, FirefoxEnv, WebKitEnv, PlaywrightOptions, setConfig, newTestType, merge } from '../../out';

// Global Folio configuration.
setConfig({
  testDir: __dirname,
  timeout: 30000,
});

// New test type that provides a number in addition to standard page, context, etc.
export const test = newTestType<{ a: number }>();
export { expect } from '../../out';

// Custom environment that provides the number.
class AEnv {
  beforeEach() {
    return { a: 42 };
  }
}

// Playwright-specific options for browser environments.
const options: PlaywrightOptions = {
  headless: true,
  viewport: { width: 1280, height: 720 },
};

// Run tests in three browsers, with custom and browser environments.
test.runWith(merge(new AEnv(), new ChromiumEnv(options)), { tag: 'chromium' });
test.runWith(merge(new AEnv(), new FirefoxEnv(options)), { tag: 'firefox' });
test.runWith(merge(new AEnv(), new WebKitEnv(options)), { tag: 'webkit' });

