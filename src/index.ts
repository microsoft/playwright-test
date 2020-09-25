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

import { config, fixtures as baseFixtures } from '@playwright/test-runner';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as playwright from 'playwright';
import rimraf from 'rimraf';
import { promisify } from 'util';
export { expect } from './matcher.fixtures';

const mkdtempAsync = promisify(fs.mkdtemp);
const removeFolderAsync = promisify(rimraf);
const mkdirAsync = promisify(fs.mkdir);

// Parameter declarations ------------------------------------------------------

type PlaywrightParameters = {
  // Browser name, one of 'chromium', 'webkit' and 'firefox', can be specified via
  // environment BROWSER=webkit or via command line, --browser-name=webkit
  browserName: string;
  // Run tests in a headful mode, can be specified via environment HEADFUL=1 or via
  // command line, --headful. Defaults to false.
  headful: boolean;
  // Whether to take screenshots on failure, --screenshot-on-failure. Defaults to false.
  screenshotOnFailure: boolean;
};

// Worker fixture declarations -------------------------------------------------
// ... those are the same for all the test in the test file.

type PlaywrightWorkerFixtures = {
  // Browser type (Chromium / WebKit / Firefox)
  browserType: playwright.BrowserType<playwright.Browser>;
  // Default browserType.launch() options.
  defaultBrowserOptions: playwright.LaunchOptions;
  // Factory for creating a browser with given additional options.
  browserFactory: (options?: playwright.LaunchOptions) => Promise<playwright.Browser>;
  // Browser instance, shared for the worker.
  browser: playwright.Browser;
};

// Test fixtures declarations, those are create for each test ------------------

type PlaywrightTestFixtures = {
  // Default browser.newContext() options.
  defaultContextOptions: playwright.BrowserContextOptions;
  // Factory for creating a context with given additional options.
  contextFactory: (options?: playwright.BrowserContextOptions) => Promise<playwright.BrowserContext>;
  // Context instance for test.
  context: playwright.BrowserContext;
  // Page instance for test.
  page: playwright.Page;
  // Temporary directory for this test's artifacts.
  tmpDir: string;
};

// Create the fixtures based on above ------------------------------------------

export const fixtures = baseFixtures
    .declareParameters<PlaywrightParameters>()
    .declareWorkerFixtures<PlaywrightWorkerFixtures>()
    .declareTestFixtures<PlaywrightTestFixtures>();

// Re-export all the test primitives for convenience.

export const it = fixtures.it;
export const fit = fixtures.fit;
export const xit = fixtures.xit;
export const describe = fixtures.describe;
export const fdescribe = fixtures.fdescribe;
export const xdescribe = fixtures.xdescribe;
export const beforeEach = fixtures.beforeEach;
export const afterEach = fixtures.afterEach;
export const beforeAll = fixtures.beforeAll;
export const afterAll = fixtures.afterAll;

// Parameter and matrix definitions --------------------------------------------

fixtures.defineParameter('browserName', 'Browser type name', '');
fixtures.defineParameter('headful', 'Whether to run tests headless or headful', process.env.HEADFUL ? true : false);
fixtures.defineParameter('screenshotOnFailure', 'Generate screenshot on failure', false);

// If browser is not specified, we are running tests against all three browsers.
fixtures.generateParametrizedTests(
    'browserName',
    process.env.BROWSER ? [process.env.BROWSER] : ['chromium', 'webkit', 'firefox']);


// Worker fixtures definitions -------------------------------------------------

fixtures.defineWorkerFixture('browserType', async ({ browserName }, test) => {
  const browserType = playwright[browserName as 'chromium' | 'firefox' | 'webkit'];
  await test(browserType);
});

fixtures.defineWorkerFixture('defaultBrowserOptions', async ({ headful }, test) => {
  await test({
    handleSIGINT: false,
    ...{ headless: !headful }
  });
});

fixtures.defineWorkerFixture('browserFactory', async ({ browserType, defaultBrowserOptions }, runTest) => {
  const browsers: playwright.Browser[] = [];
  async function browserFactory(options: playwright.LaunchOptions = {}) {
    const browser = await browserType.launch({ ...defaultBrowserOptions, ...options });
    browsers.push(browser);
    return browser;
  }
  await runTest(browserFactory);
  for (const browser of browsers)
    await browser.close();
});

fixtures.defineWorkerFixture('browser', async ({browserType, defaultBrowserOptions}, test) => {
  const browser = await browserType.launch(defaultBrowserOptions);
  await test(browser);
  await browser.close();
});

// Test fixtures definitions ---------------------------------------------------

fixtures.defineTestFixture('defaultContextOptions', async ({}, test) => {
  await test({});
});

fixtures.defineTestFixture('contextFactory', async ({ browser, defaultContextOptions, testInfo, screenshotOnFailure, testOutputFile }, runTest) => {
  const contexts: playwright.BrowserContext[] = [];
  async function contextFactory(options: playwright.BrowserContextOptions = {}) {
    const context = await browser.newContext({ ...defaultContextOptions, ...options });
    contexts.push(context);
    return context;
  }
  await runTest(contextFactory);

  if (screenshotOnFailure && (testInfo.status !== testInfo.expectedStatus)) {
    let ordinal = 0;
    for (const context of contexts) {
      for (const page of context.pages())
        await page.screenshot({ timeout: 5000, path: await testOutputFile(`test-failed-${++ordinal}.png`) });

    }
  }

  for (const context of contexts)
    await context.close();
});

fixtures.defineTestFixture('context', async ({ contextFactory }, test) => {
  const context = await contextFactory();
  await test(context);
  // context factory is taking care of closing the context.
});

fixtures.defineTestFixture('page', async ({context}, runTest) => {
  // Always create page off context so that they matched.
  await runTest(await context.newPage());
});

fixtures.defineTestFixture('tmpDir', async ({ }, test) => {
  const tmpDir = await mkdtempAsync(path.join(os.tmpdir(), 'playwright-test-'));
  await test(tmpDir);
  await removeFolderAsync(tmpDir).catch(e => { });
});

fixtures.overrideTestFixture('testOutputFile', async ({ testInfo, browserName }, runTest) => {
  const outputFile = async (suffix: string): Promise<string> => {
    const relativePath = path.relative(config.testDir, testInfo.file)
        .replace(/\.spec\.[jt]s/, '')
        .replace(new RegExp(`(tests|test|src)${path.sep}`), '');
    const sanitizedTitle = testInfo.title.replace(/[^\w\d]+/g, '_');
    const assetPath = path.join(config.outputDir, relativePath, browserName, `${sanitizedTitle}-${suffix}`);
    await mkdirAsync(path.dirname(assetPath), {
      recursive: true
    });
    return assetPath;
  };
  await runTest(outputFile);
});
