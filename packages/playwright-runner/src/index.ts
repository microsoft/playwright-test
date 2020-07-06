import {Environment} from 'describers';
import {chromium, webkit, firefox, Page, Browser} from 'playwright';

function valueFromEnv<T>(name: string, defaultValue: T) : T {
  if (!(name in process.env))
    return defaultValue;
  return typeof defaultValue ===  'string' ? process.env[name] : JSON.parse(String(process.env[name]));
}

const browserName = valueFromEnv<'chromium'|'webkit'|'firefox'>('BROWSER','chromium');
const headless = valueFromEnv('HEADLESS', true);

const env = new Environment<{page: Page}, {browser: Browser}>({
  async beforeAll(state) {
    if (state as any && (state as any).custom) return state as any;
    const browser = await ({chromium, webkit, firefox})[browserName].launch({
      headless,
      slowMo: headless ? 0 : 100,
    });
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
    const page = await state.browser.newPage();
    return {page};
  },
  async afterEach({page, browser}) {
    if (!browser)
      return;
    await page.close();
  }
});
export const extend = env.extend.bind(env);
export const test = env.test.bind(env);
export const it = env.it.bind(env);
export {describe} from 'describers';