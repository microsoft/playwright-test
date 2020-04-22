import {chromium, Page, Browser, Keyboard} from 'playwright';
import {installSuperpowers} from '../src/index';
let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser.close();
})

let page: Page;
beforeEach(async () => {
  page = await browser.newPage();
  await installSuperpowers(page);
});
afterEach(async () => {
  await page.close();
});

it('should type', async () => {
  const value = await page.evaluate(async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    await window['keyboard'].type('hello world');
    return input.value;
  });
  expect(value).toBe('hello world');
});

it('should type after reload', async () => {
  await page.reload();
  const value = await page.evaluate(async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    await window['keyboard'].type('hello world');
    return input.value;
  });
  expect(value).toBe('hello world');
});

it('should press a single key', async () => {
  await page.reload();
  const event = await page.evaluate(async () => {
    const eventPromise = new Promise<KeyboardEvent>(callback => {
      document.addEventListener('keydown', callback, {once: true});
    });
    await window['keyboard'].press('KeyC');
    const event = await eventPromise;
    return {
      key: event.key,
      code: event.code,
    };
  });
  expect(event).toEqual({
    key: 'c',
    code: 'KeyC',
  });
});

it('should throw into the page', async () => {
  const error = await page.evaluate(async () => {
    await window['keyboard'].press('VeryFakeKey');
  }).catch(e => e);
  expect(error.message).toContain('VeryFakeKey');
});

it('should click', async () => {
  await page.reload();
  const event = await page.evaluate(async () => {
    const eventPromise = new Promise<MouseEvent>(callback => {
      document.addEventListener('click', callback, {once: true});
    });
    await window['mouse'].click(33, 56);
    const event = await eventPromise;
    return {
      clientX: event.clientX,
      clientY: event.clientY,
    };
  });
  expect(event).toEqual({
    clientX: 33,
    clientY: 56,
  });
});