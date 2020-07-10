/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {chromium, Page, Browser, Keyboard} from 'playwright';
import {installSuperpowers} from '../src/index';
let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser.close();
});

let page: Page;
beforeEach(async () => {
  page = await browser.newPage();
  await installSuperpowers(page);
});
afterEach(async () => {
  await page.close();
});
describe('keyboard', () => {
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
});

describe('mouse', () => {
  it('should click', async () => {
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
});

describe('route', function() {
  it('should intercept and fulfill request', async () => {
    const content = await page.evaluate(async () => {
      await window['network'].route('https://fake_url/', async route => {
        await route.fulfill({
          body: 'hello world',
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        });
      });
      const response = await fetch('https://fake_url/');
      return response.text();
    });
    expect(content).toBe('hello world');
  });
  it('should intercept and abort request', async () => {
    const error = await page.evaluate(async () => {
      await window['network'].route('https://fake_url/', async route => {
        await route.abort();
      });
      await fetch('https://fake_url/');
    }).catch(e => e);
    expect(error.message).toContain('TypeError: Failed to fetch');
  });
  it('should intercept and continue request', async () => {
    const error = await page.evaluate(async () => {
      await window['network'].route('https://fake_url/', async route => {
        await route.continue();
      });
      await fetch('https://fake_url/');
    }).catch(e => e);
    expect(error.message).toContain('TypeError: Failed to fetch');
  });
  it('should have data on the request object', async () => {
    const request = await page.evaluate(async () => {
      let request;
      await window['network'].route('https://fake_url/', async route => {
        request = route.request();
        await route.abort();
      });
      await fetch('https://fake_url/').catch(e => e);
      return {
        url: request.url(),
        headers: request.headers(),
        postData: request.postData(),
      };
    });
    expect(request.url).toEqual('https://fake_url/');
    expect(request.postData).toEqual(null);
    expect(request.headers['user-agent']).toContain('Mozilla');
  });
  it('should not crash if the router takes awhile to evaluate', async () => {
    await page.evaluate(async () => {
      await window['network'].route('https://fake_url/', async route => {
        await route.abort();
        await new Promise(x => setTimeout(x, 500));
      });
      await fetch('https://fake_url/').catch(e => e);
    });
  });
});
