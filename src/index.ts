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

import { Browser, BrowserContext, BrowserContextOptions, Page, LaunchOptions, ViewportSize, Geolocation, HTTPCredentials } from 'playwright';
import * as folio from 'folio';
import * as fs from 'fs';
import * as util from 'util';

/**
 * The name of the browser supported by Playwright.
 */
export type BrowserName = 'chromium' | 'firefox' | 'webkit';

/**
 * Browser channel name. Used to run tests in different browser flavors,
 * for example Google Chrome Beta, or Microsoft Edge Stable.
 * @see BrowserContextOptions
 */
export type BrowserChannel = Exclude<LaunchOptions['channel'], undefined>;

/**
 * Emulates `'prefers-colors-scheme'` media feature,
 * supported values are `'light'`, `'dark'`, `'no-preference'`.
 * @see BrowserContextOptions
 */
export type ColorScheme = Exclude<BrowserContextOptions['colorScheme'], undefined>;

/**
 * An object containing additional HTTP headers to be sent with every request. All header values must be strings.
 * @see BrowserContextOptions
 */
export type ExtraHTTPHeaders = Exclude<BrowserContextOptions['extraHTTPHeaders'], undefined>;

/**
 * Proxy settings available for all tests, or individually per test.
 * @see BrowserContextOptions
 */
export type Proxy = Exclude<BrowserContextOptions['proxy'], undefined>;

/**
 * Storage state for the test.
 * @see BrowserContextOptions
 */
export type StorageState = Exclude<BrowserContextOptions['storageState'], undefined>;

/**
 * Options available to configure browser launch.
 *   - Set options in config:
 *   ```js
 *     use: { browserName: 'webkit' }
 *   ```
 *   - Set options in test file:
 *   ```js
 *     test.use({ browserName: 'webkit' })
 *   ```
 *
 * Available as arguments to the test function and all hooks (beforeEach, afterEach, beforeAll, afterAll).
 */
export type PlaywrightWorkerOptions = {
  /**
   * Name of the browser (`chromium`, `firefox`, `webkit`) that runs tests.
   */
  browserName: BrowserName;

  /**
   * Whether to run browser in headless mode. Takes priority over `launchOptions`.
   * @see LaunchOptions
   */
  headless: boolean | undefined;

  /**
   * Browser distribution channel. Takes priority over `launchOptions`.
   * @see LaunchOptions
   */
  channel: BrowserChannel | undefined;

  /**
   * Options used to launch the browser. Other options above (e.g. `headless`) take priority.
   * @see LaunchOptions
   */
  launchOptions: LaunchOptions;
};

/**
 * Options available to configure each test.
 *   - Set options in config:
 *   ```js
 *     use: { video: 'on' }
 *   ```
 *   - Set options in test file:
 *   ```js
 *     test.use({ video: 'on' })
 *   ```
 *
 * Available as arguments to the test function and beforeEach/afterEach hooks.
 */
export type PlaywrightTestOptions = {
  /**
   * Whether to capture a screenshot after each test, off by default.
   * - `off`: Do not capture screenshots.
   * - `on`: Capture screenshot after each test.
   * - `only-on-failure`: Capture screenshot after each test failure.
   */
  screenshot: 'off' | 'on' | 'only-on-failure';

  /**
  * Whether to record video for each test, off by default.
  * - `off`: Do not record video.
  * - `on`: Record video for each test.
  * - `retain-on-failure`: Record video for each test, but remove all videos from successful test runs.
  * - `retry-with-video`: Record video only when retrying a test.
  */
  video: 'off' | 'on' | 'retain-on-failure' | 'retry-with-video';

  /**
   * Whether to automatically download all the attachments. Takes priority over `contextOptions`.
   * @see BrowserContextOptions
   */
  acceptDownloads: boolean | undefined;

  /**
   * Toggles bypassing page's Content-Security-Policy. Takes priority over `contextOptions`.
   * @see BrowserContextOptions
   */
  bypassCSP: boolean | undefined;

  /**
   * Emulates `'prefers-colors-scheme'` media feature, supported values are `'light'`, `'dark'`, `'no-preference'`.
   * @see BrowserContextOptions
   */
  colorScheme: ColorScheme | undefined;

  /**
   * Specify device scale factor (can be thought of as dpr). Defaults to `1`.
   * @see BrowserContextOptions
   */
  deviceScaleFactor: number | undefined;

  /**
   * An object containing additional HTTP headers to be sent with every request. All header values must be strings.
   * @see BrowserContextOptions
   */
  extraHTTPHeaders: ExtraHTTPHeaders | undefined;

  /**
   * Context geolocation. Takes priority over `contextOptions`.
   * @see BrowserContextOptions
   */
  geolocation: Geolocation | undefined;

  /**
   * Specifies if viewport supports touch events. Takes priority over `contextOptions`.
   * @see BrowserContextOptions
   */
  hasTouch: boolean | undefined;

  /**
   * Credentials for [HTTP authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication).
   * @see BrowserContextOptions
   */
  httpCredentials: HTTPCredentials | undefined;

  /**
   * Whether to ignore HTTPS errors during navigation. Takes priority over `contextOptions`.
   * @see BrowserContextOptions
   */
  ignoreHTTPSErrors: boolean | undefined;

  /**
   * Whether the `meta viewport` tag is taken into account and touch events are enabled. Not supported in Firefox.
   * @see BrowserContextOptions
   */
  isMobile: boolean | undefined;

  /**
   * Whether or not to enable JavaScript in the context. Defaults to `true`.
   * @see BrowserContextOptions
   */
  javaScriptEnabled: boolean | undefined;

  /**
   * User locale, for example `en-GB`, `de-DE`, etc. Takes priority over `contextOptions`.
   * @see BrowserContextOptions
   */
  locale: string | undefined;

  /**
   * Whether to emulate network being offline.
   * @see BrowserContextOptions
   */
  offline: boolean | undefined;

  /**
   * A list of permissions to grant to all pages in this context. Takes priority over `contextOptions`.
   * @see BrowserContextOptions
   */
  permissions: string[] | undefined;

  /**
   * Proxy setting used for all pages in the test. Takes priority over `contextOptions`.
   * @see BrowserContextOptions
   */
  proxy: Proxy | undefined;

  /**
   * Populates context with given storage state. Takes priority over `contextOptions`.
   * @see BrowserContextOptions
   */
  storageState: StorageState | undefined;

  /**
   * Changes the timezone of the context. Takes priority over `contextOptions`.
   * @see BrowserContextOptions
   */
  timezoneId: string | undefined;

  /**
   * Specific user agent to use in this context.
   * @see BrowserContextOptions
   */
  userAgent: string | undefined;

  /**
   * Viewport used for all pages in the test. Takes priority over `contextOptions`.
   * @see BrowserContextOptions
   */
  viewport: ViewportSize | undefined;

  /**
   * Options used to create the context. Other options above (e.g. `viewport`) take priority.
   * @see BrowserContextOptions
   */
  contextOptions: BrowserContextOptions;
};


/**
 * Arguments available to the test function and all hooks (beforeEach, afterEach, beforeAll, afterAll).
 */
export type PlaywrightWorkerArgs = {
  /**
   * The Playwright instance.
   */
  playwright: typeof import('playwright');

  /**
   * Browser instance, shared between multiple tests.
   */
  browser: Browser;
};

/**
 * Arguments available to the test function and beforeEach/afterEach hooks.
 */
export type PlaywrightTestArgs = {
  /**
   * BrowserContext instance, created fresh for each test.
   */
  context: BrowserContext;

  /**
   * Page instance, created fresh for each test.
   */
  page: Page;
};

/**
 * These tests are executed in Playwright environment that launches the browser
 * and provides a fresh page to each test.
 */
export const test = folio.test.extend<PlaywrightTestArgs & PlaywrightTestOptions, PlaywrightWorkerArgs & PlaywrightWorkerOptions>({
  browserName: [ 'chromium', { scope: 'worker' } ],
  playwright: [ require('playwright'), { scope: 'worker' } ],
  headless: [ undefined, { scope: 'worker' } ],
  channel: [ undefined, { scope: 'worker' } ],
  launchOptions: [ {}, { scope: 'worker' } ],

  browser: [ async ({ playwright, browserName, headless, channel, launchOptions }, use) => {
    if (!['chromium', 'firefox', 'webkit'].includes(browserName))
      throw new Error(`Unexpected browserName "${browserName}", must be one of "chromium", "firefox" or "webkit"`);
    const options: LaunchOptions = {
      handleSIGINT: false,
      ...launchOptions,
    };
    if (headless !== undefined)
      options.headless = headless;
    if (channel !== undefined)
      options.channel = channel;
    if (process.env.PWTEST_HEADED)
      options.headless = false;
    const browser = await playwright[browserName].launch(options);
    await use(browser);
    await browser.close();
  }, { scope: 'worker' } ],

  screenshot: 'off',
  video: 'off',
  acceptDownloads: undefined,
  bypassCSP: undefined,
  colorScheme: undefined,
  deviceScaleFactor: undefined,
  extraHTTPHeaders: undefined,
  geolocation: undefined,
  hasTouch: undefined,
  httpCredentials: undefined,
  ignoreHTTPSErrors: undefined,
  isMobile: undefined,
  javaScriptEnabled: undefined,
  locale: undefined,
  offline: undefined,
  permissions: undefined,
  proxy: undefined,
  storageState: undefined,
  timezoneId: undefined,
  userAgent: undefined,
  viewport: undefined,
  contextOptions: {},

  context: async ({ browserName, browser, screenshot, video, acceptDownloads, bypassCSP, colorScheme, deviceScaleFactor, extraHTTPHeaders, hasTouch, geolocation, httpCredentials, ignoreHTTPSErrors, isMobile, javaScriptEnabled, locale, offline, permissions, proxy, storageState, viewport, timezoneId, userAgent, contextOptions }, use, testInfo) => {
    testInfo.snapshotPathSegment = browserName + '-' + process.platform;
    if (process.env.PWDEBUG)
      testInfo.setTimeout(0);

    const recordVideo = video === 'on' || video === 'retain-on-failure' ||
      (video === 'retry-with-video' && !!testInfo.retry);
    const options: BrowserContextOptions = {
      recordVideo: recordVideo ? { dir: testInfo.outputPath('') } : undefined,
      ...contextOptions,
    };
    if (acceptDownloads !== undefined)
      options.acceptDownloads = acceptDownloads;
    if (bypassCSP !== undefined)
      options.bypassCSP = bypassCSP;
    if (colorScheme !== undefined)
      options.colorScheme = colorScheme;
    if (deviceScaleFactor !== undefined)
      options.deviceScaleFactor = deviceScaleFactor;
    if (extraHTTPHeaders !== undefined)
      options.extraHTTPHeaders = extraHTTPHeaders;
    if (geolocation !== undefined)
      options.geolocation = geolocation;
    if (hasTouch !== undefined)
      options.hasTouch = hasTouch;
    if (httpCredentials !== undefined)
      options.httpCredentials = httpCredentials;
    if (ignoreHTTPSErrors !== undefined)
      options.ignoreHTTPSErrors = ignoreHTTPSErrors;
    if (isMobile !== undefined)
      options.isMobile = isMobile;
    if (javaScriptEnabled !== undefined)
      options.javaScriptEnabled = javaScriptEnabled;
    if (locale !== undefined)
      options.locale = locale;
    if (offline !== undefined)
      options.offline = offline;
    if (permissions !== undefined)
      options.permissions = permissions;
    if (proxy !== undefined)
      options.proxy = proxy;
    if (storageState !== undefined)
      options.storageState = storageState;
    if (timezoneId !== undefined)
      options.timezoneId = timezoneId;
    if (userAgent !== undefined)
      options.userAgent = userAgent;
    if (viewport !== undefined)
      options.viewport = viewport;

    const context = await browser.newContext(options);
    const allPages: Page[] = [];
    context.on('page', page => allPages.push(page));

    await use(context);

    const testFailed = testInfo.status !== testInfo.expectedStatus;
    if (screenshot === 'on' || (screenshot === 'only-on-failure' && testFailed)) {
      await Promise.all(allPages.map((page, index) => {
        const screenshotPath = testInfo.outputPath(`test-${testFailed ? 'failed' : 'finished'}-${++index}.png`);
        return page.screenshot({ timeout: 5000, path: screenshotPath }).catch(e => {});
      }));
    }
    await context.close();

    const deleteVideos = video === 'retain-on-failure' && !testFailed;
    if (deleteVideos) {
      await Promise.all(allPages.map(async page => {
        const video = page.video();
        if (!video)
          return;
        const videoPath = await video.path();
        await util.promisify(fs.unlink)(videoPath).catch(e => {});
      }));
    }
  },

  page: async ({ context }, use) => {
    await use(await context.newPage());
  },
});
export * from 'folio';
export default test;

export const it = test;
export const describe: (typeof test)['describe'] = test.describe;
export const beforeEach = test.beforeEach;
export const afterEach = test.afterEach;
export const beforeAll = test.beforeAll;
export const afterAll = test.afterAll;

export type PlaywrightTestProject<TestArgs = {}, WorkerArgs = {}> = folio.Project<PlaywrightTestOptions & TestArgs, PlaywrightWorkerOptions & WorkerArgs>;
export type PlaywrightTestConfig<TestArgs = {}, WorkerArgs = {}> = folio.Config<PlaywrightTestOptions & TestArgs, PlaywrightWorkerOptions & WorkerArgs>;
