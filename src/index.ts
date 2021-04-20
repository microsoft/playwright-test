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

import { Browser, BrowserContext, BrowserContextOptions, Page, LaunchOptions } from 'playwright';
import * as folio from 'folio';
import * as fs from 'fs';
import * as util from 'util';

export * from 'folio';
export { BrowserContextOptions, LaunchOptions } from 'playwright';

export type BrowserName = 'chromium' | 'firefox' | 'webkit';

// Arguments available to the test function.
export type PlaywrightTestArgs = {
  // Playwright.
  playwright: typeof import('playwright');

  // Name of the browser (chromium, firefox, webkit) that runs this test.
  browserName: BrowserName;

  // Browser instance, shared between many tests.
  browser: Browser;

  // BrowserContext instance, created fresh for each test.
  context: BrowserContext;

  // Page instance, created fresh for each test.
  page: Page;
};

export type PlaywrightOptions =
  // All browser launch options are supported.
  LaunchOptions &

  // All browser context options are supported.
  BrowserContextOptions &

  // Testing options.
  {
    // Whether to capture a screenshot after each test, off by default.
    // - off: Do not capture screenshots.
    // - on: Capture screenshot after each test.
    // - only-on-failure: Capture screenshot after each test failure.
    screenshot?: 'off' | 'on' | 'only-on-failure';

    // Whether to record video for each test, off by default.
    // - off: Do not record video.
    // - on: Record video for each test.
    // - retain-on-failure: Record video for each test,
    //     but remove all videos from successful test runs.
    // - retry-with-video: Record video only when retrying a test.
    video?: 'off' | 'on' | 'retain-on-failure' | 'retry-with-video';

    // Where to look for test snapshots (usually screenshots).
    // Defaults to different snapshots for each browser and platform.
    //
    // To make snapshots platform-agnostic:
    //    new ChromiumEnv({ snapshotPathSegment: 'chromium' })
    //
    // To make snapshots browser-agnostic:
    //    new ChromiumEnv({ snapshotPathSegment: '' })
    snapshotPathSegment?: string;
  };

export class PlaywrightEnv implements folio.Env<PlaywrightTestArgs> {
  private _playwright: typeof import('playwright') | undefined;
  private _browserName: BrowserName;
  private _options: PlaywrightOptions;
  private _browser: Browser | undefined;
  private _context: BrowserContext | undefined;
  private _page: Page | undefined;
  private _allPages: Page[] = [];

  constructor(browserName: BrowserName, options: PlaywrightOptions = {}) {
    this._browserName = browserName;
    this._options = options;
  }

  async beforeAll() {
    this._playwright = require('playwright');
    this._browser = await this._playwright![this._browserName].launch({
      ...this._options,
      handleSIGINT: false,
    });
  }

  async beforeEach(testInfo: folio.TestInfo) {
    const options = testInfo.testOptions as PlaywrightTestOptions;
    const recordVideo = this._options.video === 'on' || this._options.video === 'retain-on-failure' ||
        (this._options.video === 'retry-with-video' && !!testInfo.retry);
    this._context = await this._browser!.newContext({
      recordVideo: recordVideo ? { dir: testInfo.outputPath('') } : undefined,
      ...this._options,
      ...options.contextOptions
    });
    this._allPages = [];
    this._context.on('page', page => this._allPages.push(page));
    this._page = await this._context.newPage();
    testInfo.snapshotPathSegment = this._options.snapshotPathSegment === undefined
      ? (this._browserName + '-' + process.platform)
      : this._options.snapshotPathSegment;
    return {
      playwright: this._playwright!,
      browserName: this._browserName,
      browser: this._browser!,
      context: this._context!,
      page: this._page!,
    };
  }

  async afterEach(testInfo: folio.TestInfo) {
    const testFailed = testInfo.status !== testInfo.expectedStatus;
    if (this._context) {
      if (this._options.screenshot === 'on' || (this._options.screenshot === 'only-on-failure' && testFailed)) {
        await Promise.all(this._context.pages().map((page, index) => {
          const screenshotPath = testInfo.outputPath(`test-${testFailed ? 'failed' : 'finished'}-${++index}.png`);
          return page.screenshot({ timeout: 5000, path: screenshotPath }).catch(e => {});
        }));
      }
      await this._context.close();
    }
    const deleteVideos = this._options.video === 'retain-on-failure' && !testFailed;
    if (deleteVideos) {
      await Promise.all(this._allPages.map(async page => {
        const video = page.video();
        if (!video)
          return;
        const videoPath = await video.path();
        await util.promisify(fs.unlink)(videoPath).catch(e => {});
      }));
    }
    this._allPages = [];
    this._context = undefined;
    this._page = undefined;
  }

  async afterAll() {
    if (this._browser)
      await this._browser.close();
    this._browser = undefined;
  }
}

// Environment that runs tests in Chromium.
export class ChromiumEnv extends PlaywrightEnv {
  constructor(options: PlaywrightOptions = {}) {
    super('chromium', options);
  }
}

// Environment that runs tests in Firefox.
export class FirefoxEnv extends PlaywrightEnv {
  constructor(options: PlaywrightOptions = {}) {
    super('firefox', options);
  }
}

// Environment that runs tests in WebKit.
export class WebKitEnv extends PlaywrightEnv {
  constructor(options: PlaywrightOptions = {}) {
    super('webkit', options);
  }
}

type PlaywrightTestOptions = {
  // Browser context options for a single test,
  // in addition to context options specified for the whole environment.
  contextOptions?: BrowserContextOptions;
};

export function newTestType<TestArgs = {}, TestOptions = {}>() {
  return folio.newTestType<TestArgs & PlaywrightTestArgs, TestOptions & PlaywrightTestOptions>();
}

export const test = newTestType();
