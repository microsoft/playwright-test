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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';

import { fixtures as baseFixtures } from '@playwright/test-runner';
import { LaunchOptions, BrowserType, Browser, BrowserContext, Page, chromium, firefox, webkit, BrowserContextOptions, devices } from 'playwright';

const mkdirAsync = promisify(fs.mkdir);
const mkdtempAsync = promisify(fs.mkdtemp);
const removeFolderAsync = promisify(rimraf);

type PlaywrightParameters = {
  browserName: string;
  device: string | null;
};

type PlaywrightTestFixtures = {
  context: BrowserContext;
  page: Page;
  tmpDir: string;
  outputFile: (suffix: string) => Promise<string>;
};

type PlaywrightWorkerFixtures = {
  browserType: BrowserType<Browser>;
  browser: Browser;
  defaultBrowserOptions: LaunchOptions;
  defaultContextOptions: BrowserContextOptions;
};

export const fixtures = baseFixtures
    .declareParameters<PlaywrightParameters>()
    .declareWorkerFixtures<PlaywrightWorkerFixtures>()
    .declareTestFixtures<PlaywrightTestFixtures>();

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
export const expect = fixtures.expect;

fixtures.defineWorkerFixture('browserType', async ({ browserName }, test) => {
  const browserType = ({chromium, firefox, webkit})[browserName as 'chromium' | 'firefox' | 'webkit'];
  await test(browserType);
});

fixtures.defineParameter('browserName', 'Browser name', 'chromium');
fixtures.defineParameter('device', 'Device name', null);

fixtures.defineWorkerFixture('browser', async ({browserType, defaultBrowserOptions}, test) => {
  const browser = await browserType.launch(defaultBrowserOptions);
  await test(browser);
  await browser.close();
});

fixtures.defineWorkerFixture('defaultContextOptions', async ({device}, test) => {
  let contextOptions: BrowserContextOptions = {};

  if (device && typeof device === 'string')
    contextOptions = devices[device];
  else if (device && typeof device === 'object')
    contextOptions = device;

  await test({
    ...contextOptions
  });
});

fixtures.defineWorkerFixture('defaultBrowserOptions', async ({}, test) => {
  await test({
    handleSIGINT: false,
    ...(process.env.HEADFUL ? {headless: false} : {})
  });
});

fixtures.defineTestFixture('context', async ({browser, defaultContextOptions}, test) => {
  const context = await browser.newContext(defaultContextOptions);
  await test(context);
  await context.close();
});

fixtures.defineTestFixture('page', async ({context}, runTest) => {
  await runTest(await context.newPage());
});

fixtures.defineTestFixture('tmpDir', async ({ }, test) => {
  const tmpDir = await mkdtempAsync(path.join(os.tmpdir(), 'playwright-test-'));
  await test(tmpDir);
  await removeFolderAsync(tmpDir).catch(e => { });
});

fixtures.defineTestFixture('outputFile', async ({ testInfo }, runTest) => {
  const outputFile = async (suffix: string): Promise<string> => {
    const relativePath = path.relative(testInfo.config.testDir, testInfo.file)
        .replace(/\.spec\.[jt]s/, '')
        .replace(new RegExp(`(tests|test|src)${path.sep}`), '');
    const sanitizedTitle = testInfo.title.replace(/[^\w\d]+/g, '_');
    const assetPath = path.join(testInfo.config.outputDir, relativePath, `${sanitizedTitle}-${suffix}`);
    await mkdirAsync(path.dirname(assetPath), {
      recursive: true
    });
    return assetPath;
  };
  await runTest(outputFile);
});
