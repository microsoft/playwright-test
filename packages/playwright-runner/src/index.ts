/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {Environment, API} from 'describers';
import {chromium, webkit, firefox, Page, Browser, BrowserServer, LaunchOptions, BrowserType, BrowserContext} from 'playwright';

function valueFromEnv<T>(name: string, defaultValue: T) : T {
  if (!(name in process.env))
    return defaultValue;
  return typeof defaultValue ===  'string' ? process.env[name] : JSON.parse(String(process.env[name]));
}

const browserName = valueFromEnv<'chromium'|'webkit'|'firefox'>('BROWSER','chromium');
const headless = valueFromEnv('HEADLESS', true);

function launchOptions(options?: LaunchOptions) {
  return {
    headless,
    slowMo: headless ? 0 : 100,
    ...options
  };
}
const browsersForLauncher = new WeakMap<BrowserType<Browser>, Set<Browser|BrowserServer>>();
export const launchEnv = new Environment<void, {launcher: BrowserType<Browser>}>({
  async beforeAll() {
    const browserType = ({chromium, webkit, firefox})[browserName];
    const browsers = new Set<Browser|BrowserServer>();
    const launcher: BrowserType<Browser> = {
      async connect(options) {
        const browser = await browserType.connect(options);
        browsers.add(browser);
        browser.on('disconnected', () => browsers.delete(browser));
        return browser;
      },
      executablePath() {
        return browserType.executablePath();
      },
      async launch(options) {
        const browser = await browserType.launch(launchOptions(options));
        browsers.add(browser);
        browser.on('disconnected', () => browsers.delete(browser));
        return browser;
      },
      async launchPersistentContext(userDataDir, options) {
        const context = await browserType.launchPersistentContext(userDataDir, launchOptions(options));
        return context;
      },
      async launchServer(options) {
        const server = await browserType.launchServer(launchOptions(options));
        browsers.add(server);
        server.on('close', () => browsers.delete(server));
        return server;
      },
      name() {
        return browserName;
      }
    };
    (launcher as any)._defaultArgs = (options: any, ...args: any[]) => {
      return (browserType as any)._defaultArgs(launchOptions(options), ...args);
    };
    browsersForLauncher.set(launcher, browsers);
    return {launcher};
  },
  async afterAll({launcher}) {
    const browsers = browsersForLauncher.get(launcher)!;
    for (const browser of browsers)
      await browser.close();
  },
  async beforeEach() {
  },
  async afterEach() {
  }
});

export const pageEnv = launchEnv.mixin(new Environment<{page: Page, context: BrowserContext}, {browser: Browser}>({
  async beforeAll(state) {
    if (state as any && (state as any).custom) return state as any;
    const browser = await ({chromium, webkit, firefox})[browserName].launch(launchOptions());
    return {browser};
  },
  async afterAll({browser}) {
    if (!browser)
      return;
    await browser.close();
  },
  async beforeEach(state) {
    if ('page' in state)
      return state as any;
    const context = await state.browser.newContext();
    const page = await context.newPage();
    return {page, context};
  },
  async afterEach({page, browser}) {
    if (!browser)
      return;
    await page.close();
  }
}));
export const test = pageEnv.test;
export const it = pageEnv.it;
export const CHROMIUM = browserName === 'chromium';
export const FIREFOX = browserName === 'firefox';
export const WEBKIT = browserName === 'webkit';
export const HEADLESS = headless;
export const BROWSER = browserName;
export {describe} from 'describers';