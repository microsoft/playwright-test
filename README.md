# 🎭 playwright-test

> 🚧 This project is under development. See [Test runner integrations](https://playwright.dev/#path=docs%2Ftest-runners.md&q=) to use Jest or Mocha with Playwright.

Build an end-to-end test suite with Playwright.

- **Parallelized execution** across multiple browsers.
- **Annotate your tests** to mark your tests as `flaky`, `fixme`, `skip`, `slow` or `fail` and get better reporting.
- **Shape your tests** with built-in and custom fixtures.
- Control test execution with test retries.
- Built-in support for **TypeScript**.

## Get started
```
npm i -D @playwright/test
```

Place tests in files ending with `.spec.js` or `.spec.ts`.

```js
// src/foo.spec.ts
const { it, expect } = require('@playwright/test');

it('is a basic test with the page', async ({page}) => {
  await page.goto('https://playwright.dev/');
  const home = await page.waitForSelector('home-navigation');
  expect(await home.evaluate(home => home.innerText)).toBe('🎭 Playwright');
});
```

Run all tests across Chromium, Firefox and WebKit

```
npx test-runner
```

Run tests on a single browser

```
npx test-runner --browser-name=chromium
```

Run all tests in headful mode

```
npx test-runner --headful
```

Take screenshots on failure

```
npx test-runner --screenshot-on-failure
```

See all options

```
npx test-runner --help
```

## Test fixtures
TODO

## Parameterize your tests
A common pattern with end-to-end tests is to run test suites against multiple
parameters.

#### Default parameters
`browserName`: Can be `chromium`, `firefox` or `webkit`. Tests are parameterized
across the 3 browsers.

#### Custom parameters
You can define custom parameters

```js
import { fixtures } from '@playwright/test';

// Define the parameter
fixtures.defineParameter('appUrl', 'URL of the app to test against', 'http://localhost');
//                         |          |                               |
//                       Name      Description                     Default value

// To generate parameterized tests
fixtures.generateParameterizedTests('appUrl', ['https://production.app',
                                               'https://staging.app']);

// Use in your test
// NOTE: Only the tests that have appUrl as arguments will be parameterized
it('should add item to cart', async ({ appUrl }) => {
  // ...
})
```

To run tests with a custom value for the parameter, convert the name of the parameter
into kebab-case (`appUrl` becomes `app-url`)

```
npx test-runner --app-url=https://newlocation.app
```

## Annotate your tests
Annotate your tests with modifiers: `flaky`, `fixme`, `fail`, `skip`, and `slow`.

Annotations can be applied conditionally with parameters.

```js
test.skip(params.browserName === 'firefox', 'Not supported for Firefox')
```

One or more annotations can be combined.

```js
it('should add item to cart', (test, params) => {
  test.flaky('Uses Math.random internally')
  test.skip(params.browserName == 'firefox')
}, async ({ page }) => {
  // Test content
})
```
