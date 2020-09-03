# 🎭 playwright-runner

> This package is not ready for use. If you want to run tests with playwright, checkout [jest-playwright](https://github.com/mmarkelov/jest-playwright) for Jest or [karma-playwright-launcher](https://github.com/JoelEinbinder/karma-playwright-launcher) for Karma.

A test runner for running tests with Playwright.

1. `npm i -D playwright-runner`
2. Place unit tests in files ending with `.spec.*`.
```js
// src/foo.spec.ts
import 'playwright-runner';
import { it, expected } from '@playwright/test-runner';

it('is a basic test with the page', async ({page}) => {
  await page.goto('https://playwright.dev/');
  const home = await page.waitForSelector('home-navigation');
  expect(await home.evaluate(home => home.innerText)).toBe('🎭 Playwright');
});
```
5. Run all of your tests with `npx test-runner .`
