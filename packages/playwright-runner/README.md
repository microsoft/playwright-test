# 🎭 playwright-runner

> This package is not ready for use. If you want to run tests with playwright, checkout [jest-playwright](https://github.com/mmarkelov/jest-playwright) for Jest or [karma-playwright-launcher](https://github.com/JoelEinbinder/karma-playwright-launcher) for Karma.

A Jest preset for running tests with Playwright.

1. Install `playwright-runner`, `jest`.
2. Specify `playwright-runner` in your Jest configuration:
```json
{
  "preset": "playwright-runner"
}
```
3. Place unit tests in files ending with `.spec.*` or `.test.*`.
```js
// src/App.spec.jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './App';

it('should work', function() {
  const container = document.createElement('div');
  ReactDOM.render(<App />, container);
  expect(container.textContent).toBe('Hello World');
});
```
4. Place end-to-end tests inside an `e2e` folder.
```js
// e2e/basic.test.js
it('is a basic test with the page', async ({page}) => {
  await page.goto('https://playwright.dev/');
  const home = await page.waitForSelector('home-navigation');
  expect(await home.evaluate(home => home.innerText)).toBe('🎭 Playwright');
});
```
5. Run all of your tests with `jest`
