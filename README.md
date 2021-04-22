# ⚠️ This project is not ready for production. Stay tuned! ⚠️

# 🎭 Playwright test runner [![npm version](https://img.shields.io/npm/v/@playwright/test.svg?style=flat)](https://www.npmjs.com/package/@playwright/test)

Cross-browser end-to-end testing for web apps. Browser automation with [Playwright](https://playwright.dev), Jest-like assertions and built-in support for TypeScript.

Playwright test runner is **available in preview** and minor breaking changes could happen. We welcome your feedback to shape this towards 1.0.

- [Get started](#get-started)
  - [Installation](#installation)
  - [Write a test](#write-a-test)
  - [Write a configuration file](#write-a-configuration-file)
  - [Run the test](#run-the-test)
- [Examples](#examples)
  - [Multiple pages](#multiple-pages)
  - [Mobile emulation](#mobile-emulation)
  - [Network mocking](#network-mocking)
  - [Visual comparisons](#visual-comparisons)
- [Configuration](#configuration)
  - [Modify options](#modify-options)
  - [Skip tests with annotations](#skip-tests-with-annotations)
  - [Modify context options for a single test](#modify-context-options-for-a-single-test)
  - [Export JUnit report](#export-junit-report)

## Get started

### Installation

```sh
npm i -D @playwright/test
```

### Write a test

Create `foo.spec.ts` to define your test. The test function uses the [`page`][page] argument for browser automation.

```ts
import { test, expect } from "@playwright/test";

test("is a basic test with the page", async ({ page }) => {
  await page.goto("https://playwright.dev/");
  const name = await page.innerText(".navbar__title");
  expect(name).toBe("Playwright");
});
```

The test runner provides browser primitives as arguments to your test functions. Test functions can use one or more of these arguments.

- `page`: Instance of [Page][page]. Each test gets a new isolated page to run the test.
- `context`: Instance of [BrowserContext][browser-context]. Each test gets a new isolated context to run the test. The `page` object belongs to this context. Learn [how to configure](#modify-options) context creation.
- `browser`: Instance of [Browser][browser]. Browsers are shared across tests to optimize resources. Learn [how to configure](#modify-options) browser launch.
- `browserName`: The name of the browser currently running the test. Either `chromium`, `firefox` or `webkit`.

### Write a configuration file

Create `config.ts` to configure your tests. Here is an example configuration that runs every test in Chromium, Firefox and WebKit.

```ts
import { ChromiumEnv, FirefoxEnv, WebKitEnv, test, setConfig } from "@playwright/test";

setConfig({
  testDir: __dirname,  // Search for tests in this directory.
  timeout: 30000,  // Each test is given 30 seconds.
});

const options = {
  headless: true,  // Run tests in headless browsers.
  viewport: { width: 1280, height: 720 },
};

// Run tests in three browsers.
test.runWith(new ChromiumEnv(options), { tag: 'chromium' });
test.runWith(new FirefoxEnv(options), { tag: 'firefox' });
test.runWith(new WebKitEnv(options), { tag: 'webkit' });
```

### Run the test

Tests can be run in single or multiple browsers, in parallel or sequentially.

```sh
# Run all tests across Chromium, Firefox and WebKit
$ npx folio --config=config.ts

# Run tests on a single browser
$ npx folio --config=config.ts --tag=chromium

# Run tests in parallel
$ npx folio --config=config.ts --workers=5

# Run tests sequentially
$ npx folio --config=config.ts --workers=1

# Retry failing tests
$ npx folio --config=config.ts --retries=2

# See all options
$ npx folio --help
```

Refer to the [command line documentation][folio-cli] for all options.

#### Configure NPM scripts

Save the run command as an NPM script.

```json
{
  "scripts": {
    "test": "npx folio --config=config.ts"
  }
}
```

### Tests and assertions syntax

- Use `test` to write test functions. Run a single test with `test.only` and skip a test with `test.skip`.
- Use `test.describe` to group related tests together.
- Use `test.beforeAll` and `test.afterAll` hooks to set up and tear down resources shared between tests.
- Use `test.beforeEach` and `test.afterEach` hooks to set up and tear down resources for each test individually.
- For assertions, use the [`expect` API](https://jestjs.io/docs/expect).

```js
const { test, expect } = require("@playwright/test");

test.describe("feature foo", () => {
  test.beforeEach(async ({ page }) => {
    // Go to the starting url before each test.
    await page.goto("https://my.start.url/feature-foo");
  });

  test("is working correctly", async ({ page }) => {
    // Assertions use the expect API.
    expect(page.url()).toBe("https://my.start.url/feature-foo");
  });
});
```

-----------

## Examples

### Multiple pages

The default `context` argument is a [BrowserContext][browser-context]. Browser contexts are isolated execution environments that can host multiple pages. See [multi-page scenarios][multi-page] for more examples.

```js
import { test } from "@playwright/test";

test("tests on multiple web pages", async ({ context }) => {
  const pageFoo = await context.newPage();
  const pageBar = await context.newPage();
  // Test function
});
```

### Mobile emulation

`options` in the configuration file can be used to configure mobile emulation in the default `context`.

```diff
// config.ts
import { ChromiumEnv, FirefoxEnv, WebKitEnv, test, setConfig } from "@playwright/test";
+ import { devices } from "playwright";

setConfig({
  testDir: __dirname,  // Search for tests in this directory.
  timeout: 30000,  // Each test is given 30 seconds.
});

const options = {
  headless: true,  // Run tests in headless browsers.
-  viewport: { width: 1280, height: 720 },
+  ...devices["iPhone 11"],
};

// Run tests in three browsers.
test.runWith(new ChromiumEnv(options), { tag: 'chromium' });
test.runWith(new FirefoxEnv(options), { tag: 'firefox' });
test.runWith(new WebKitEnv(options), { tag: 'webkit' });
```

### Network mocking

Define a custom route that mocks network calls for a browser context.

```js
// In foo.spec.ts
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  // Block any css requests for each test in this file.
  await context.route(/.css/, route => route.abort());
});

test("loads page without css", async ({ page }) => {
  // Alternatively, block any png requests just for this test.
  await page.route(/.png/, route => route.abort());

  // Test function code.
  await page.goto("https://stackoverflow.com");
});
```

### Visual comparisons

The `expect` API supports visual comparisons with `toMatchSnapshot`. This uses the [pixelmatch](https://github.com/mapbox/pixelmatch) library, and you can pass `threshold` as an option.

```js
import { test, expect } from "@playwright/test";

test("compares page screenshot", async ({ page }) => {
  await page.goto("https://stackoverflow.com");
  const screenshot = await page.screenshot();
  expect(screenshot).toMatchSnapshot(`test.png`, { threshold: 0.2 });
});
```

On first execution, this will generate golden snapshots. Subsequent runs will compare against the golden snapshots. To update golden snapshots with new actuals, run with the `--update-snapshots` flag.

```sh
# Update golden snapshots when they differ from actual
npx folio --update-snapshots
```

-----------

## Configuration

### Modify options

You can modify browser launch options, context creation options and testing options in the configuration file.

```diff
// config.ts
import { ChromiumEnv, FirefoxEnv, WebKitEnv, test, setConfig } from "@playwright/test";

setConfig({
  testDir: __dirname,  // Search for tests in this directory.
-  timeout: 30000,  // Each test is given 30 seconds.
+  timeout: 90000,  // Each test is given 90 seconds.
+  retries: 2,  // Failing tests will be retried at most two times.
});

const options = {
-  headless: true,  // Run tests in headless browsers.
-  viewport: { width: 1280, height: 720 },
+  // Launch options:
+  headless: false,
+  slowMo: 50,
+  // Context options:
+  viewport: { width: 800, height: 600 },
+  ignoreHTTPSErrors: true,
+  // Testing options:
+  video: 'retain-on-failure',
};

// Run tests in three browsers.
test.runWith(new ChromiumEnv(options), { tag: 'chromium' });
test.runWith(new FirefoxEnv(options), { tag: 'firefox' });
test.runWith(new WebKitEnv(options), { tag: 'webkit' });
```

See the full list of launch options in [`browserType.launch()`](https://playwright.dev/docs/api/class-browsertype#browsertypelaunchoptions) documentation.

See the full list of context options in [`browser.newContext()`](https://playwright.dev/docs/api/class-browser#browsernewcontextoptions) documentation.

Available testing options:
- `screenshot: 'off' | 'on' | 'only-on-failure'` - Whether to capture a screenshot after each test, off by default.
  - `off` - Do not capture screenshots.
  - `on` - Capture screenshot after each test.
  - `only-on-failure` - Capture screenshot after each test failure.
- `video: 'off' | 'on' | 'retain-on-failure' | 'retry-with-video'` - Whether to record video for each test, off by default.
  - `off` - Do not record video.
  - `on` - Record video for each test.
  - `retain-on-failure`  - Record video for each test, but remove all videos from successful test runs.
  - `retry-with-video` - Record video only when retrying a test.

Most notable `setConfig` options, see the full list in [Folio documentation](https://github.com/microsoft/folio):
- `retries: number` - Each failing test will be retried up to the certain number of times.
- `testDir: string` - Directory where test runner should search for test files.
- `timeout: number` - Timeout in milliseconds for each test.
- `workers: number` - The maximum number of worker processes to run in parallel.

#### Browser-specific options

You can specify different options for each browser when creating a corresponding environment.

```diff
// config.ts
import { ChromiumEnv, FirefoxEnv, WebKitEnv, test, setConfig } from "@playwright/test";

setConfig({
  testDir: __dirname,  // Search for tests in this directory.
  timeout: 30000,  // Each test is given 30 seconds.
});

const options = {
  headless: true,  // Run tests in headless browsers.
  viewport: { width: 1280, height: 720 },
};

// Run tests in three browsers.
test.runWith(new ChromiumEnv(options), { tag: 'chromium' });
test.runWith(new FirefoxEnv(options), { tag: 'firefox' });
- test.runWith(new WebKitEnv(options), { tag: 'webkit' });
+ test.runWith(new WebKitEnv({
+   ...options,
+   viewport: { width: 800, height: 600 },  // Use different viewport for WebKit.
+ }), { tag: 'webkit' });
```

### Skip tests with annotations

The Playwright test runner can annotate tests to skip under certain parameters. This is enabled by [Folio annotations][folio-annotations].

```js
test("should be skipped on firefox", async ({ page, browserName }) => {
  test.skip(browserName === "firefox", "optional description for the skip");
  // Test function
});
```

### Modify context options for a single test

Pass a second parameter that has `contextOptions` property to the `test` function:

```js
const options = {
  contextOptions: {
    ignoreHTTPSErrors: true,
  }
};

test("no https errors in this test", options, async ({ page }) => {
  // Test function
});
```

### Export JUnit report

The Playwright test runner supports various reporters, including exporting as a JUnit compatible XML file.

```diff
// config.ts
import { ChromiumEnv, FirefoxEnv, WebKitEnv, test, setConfig } from "@playwright/test";
+ import { reporters, setReporters } from "@playwright/test";

setConfig({
  testDir: __dirname,  // Search for tests in this directory.
  timeout: 30000,  // Each test is given 30 seconds.
});

+ setReporters([
+   // Report to the terminal with "line" reporter.
+   new reporters.line(),
+   // Additionally, output a JUnit XML file.
+   new reporters.junit({ outputFile: 'junit.xml' }),
+ ]);

const options = {
  headless: true,  // Run tests in headless browsers.
  viewport: { width: 1280, height: 720 },
};

// Run tests in three browsers.
test.runWith(new ChromiumEnv(options), { tag: 'chromium' });
test.runWith(new FirefoxEnv(options), { tag: 'firefox' });
test.runWith(new WebKitEnv(options), { tag: 'webkit' });
```

[multi-page]: https://playwright.dev/docs/multi-pages
[browser]: https://playwright.dev/docs/api/class-browser
[browser-context]: https://playwright.dev/docs/api/class-browsercontext
[page]: https://playwright.dev/docs/api/class-page
[folio-annotations]: https://github.com/microsoft/folio#annotations
[folio-cli]: https://github.com/microsoft/folio#command-line
