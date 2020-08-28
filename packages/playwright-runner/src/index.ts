/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {registerWorkerFixture, registerFixture} from '@playwright/test-runner';
import {LaunchOptions, BrowserType, Browser, BrowserContext, Page, chromium, firefox, webkit} from 'playwright';
export * from '@playwright/test-runner';

declare global {
  interface WorkerState {
    browserType: BrowserType<Browser>;
    browser: Browser;
    defaultBrowserOptions: LaunchOptions;
  }
  interface TestState {
    context: BrowserContext;
    page: Page;
  }
  interface FixtureParameters {
    browserName: 'chromium'|'firefox'|'webkit';
  }
}

registerWorkerFixture('browserType', async ({browserName}, test) => {
  const browserType = ({chromium ,firefox, webkit})[browserName];
  await test(browserType);
});

registerWorkerFixture('browserName', async ({}, test) => {
  await test((process.env.BROWSER as any) || 'chromium');
});

registerWorkerFixture('browser', async ({browserType, defaultBrowserOptions}, test) => {
  const browser = await browserType.launch(defaultBrowserOptions);
  await test(browser);
  await browser.close();
});

registerWorkerFixture('defaultBrowserOptions', async ({}, test) => {
  await test({
    handleSIGINT: false,
  });
});

registerFixture('context', async ({browser}, test) => {
  const context = await browser.newContext();
  await test(context);
  await context.close();
});

registerFixture('page', async ({context}, runTest) => {
  await runTest(await context.newPage());
});