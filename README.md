# 🎭 playwright-test

> 🚧 This project is under development. See [Test runner integrations](https://playwright.dev/#path=docs%2Ftest-runners.md&q=) to use Jest or Mocha with Playwright.

Build an end-to-end test suite with Playwright.

- [**Parallelized execution**](#parallelized-execution) across multiple browsers.
- Setup your environment with [**test fixtures**](#setup-environment-with-fixtures).
- [**Parameterize your tests**](#parameterize-your-tests) to run tests against all scenarios.
- [**Annotate your tests**](#annotate-your-tests) to mark flaky or slow tests.
- Use Jest-like [syntax for specs](#spec-syntax) and [assertions](#assertions).
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
npx test
```

Run tests on a single browser

```
npx test --browser-name=chromium
```

Run all tests in headful mode

```
npx test --headful
```

Take screenshots on failure

```
npx test --screenshot-on-failure
```

See all options

```
npx test --help
```

## Parallelized execution
The test runner launches a number of worker processes to parallelize test execution. By default, this number is equal to number of CPU cores divided by 2. Each worker process runs a browser and some tests.

To run in serial, use the `--jobs` flag.

```
npx test --jobs 1
```

## Setup environment with fixtures
Fixtures initialize your test functions. Fixtures can be used to set up the test environment with services and state that are required by the test.

For end-to-end testing, this test runner sets up a page in a browser. This behavior
can be customized.

#### Default fixtures
* Each worker process launches a browser (this is the `browser` fixture).
  * The `browser` fixture uses the `defaultBrowserOptions` fixture to define [browser launch options][browser-opts].
* Each worker runs tests.
* Each test is provided a browser context (`context` fixture) and a page (`page` fixture). Browser contexts are isolated execution environments that share a browser instance.
  * The `context` fixture uses the `defaultContextOptions` fixture to define [context options][context-opts].

Examples

```js
// Test uses the page fixture
it('should load the website', async ({ page }) => {
  await page.goto('https://playwright.dev');
  expect(await page.title()).toContain('Playwright');
});

// Test uses the context fixture and launches multiple pages
it('should load two pages', async ({ context }) => {
  const pageOne = await context.newPage();
  const pageTwo = await context.newPage();
  // ...
})
```

#### Override default fixtures
Default options can be overriden to specific testing requirements. For example, `defaultContextOptions` can be modified to launch browser contexts with mobile emulation.

```js
const { fixtures } = require('@playwright/test');
const { devices } = require('playwright');

fixtures.overrideTestFixture('defaultContextOptions', async ({}, test) => {
  await test({ ...devices['iPhone 11'] })
});
```

#### Define custom fixtures
It is possible to define custom fixtures to setup the test environment. If the fixture is to be shared across tests, define a worker-level fixture. If not, use test-level fixtures.

For example, we can extend the default `page` fixture to navigate to a URL before running the tests. This will be a test-level fixture. This can be further extended to wrap the page into a page object model.

```js
fixtures.defineTestFixture('homePage', async({page}, test) => {
  await page.goto('https://playwright.dev/');
  await test(page);
});

it('should be on the homepage', async ({homePage}) => {
  expect(await homePage.title()).toContain('Playwright');
});
```

TODO: How to add TypeScript support with `declareTestFixtures`

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

TODO: How to add TypeScript support with `declareParameters`

To run tests with a custom value for the parameter, convert the name of the parameter
into kebab-case (`appUrl` becomes `app-url`)

```
npx test --app-url=https://newlocation.app
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

## Spec syntax

To run a single test use `fit` or `it.only`.

```js
const { it, fit } = require('@playwright/test');

it.only('should be focused', ...);
// Alternatively
fit('should be focused', ...);
```

To skip a test use `xit` or `it.skip`.

```js
const { it, fit } = require('@playwright/test');

it.skip('should be skipped', ...);
// Alternatively
xit('should be skipped', ...);
```

Tests can be wrapped inside `describe` blocks to structure tests.

## Assertions

For assertions, the test runner uses the popular [expect](https://www.npmjs.com/package/expect) package. See
[expect API reference](https://jestjs.io/docs/en/expect).


[browser-opts]: https://playwright.dev/#path=docs%2Fapi.md&q=browsertypelaunchoptions
[context-opts]: https://playwright.dev/#path=docs%2Fapi.md&q=browsernewcontextoptions
