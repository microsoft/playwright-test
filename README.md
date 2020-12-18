# 🎭 Playwright test runner [![npm version](https://img.shields.io/npm/v/@playwright/test.svg?style=flat)](https://www.npmjs.com/package/@playwright/test)

Zero config cross-browser end-to-end testing for web apps. Browser automation with [Playwright](https://playwright.dev), Jest-like assertions and built-in support for TypeScript.

Playwright test runner is **available in preview** and minor breaking changes could happen. We welcome your feedback to shape this towards 1.0.

- [Get started](#get-started)
  - [Installation](#installation)
  - [Write a test](#write-a-test)
  - [Run the test](#run-the-test)
- [Examples](#examples)
  - [Multiple pages](#multiple-pages)
  - [Mobile emulation](#mobile-emulation)
  - [Network mocking](#network-mocking)
  - [Visual comparisons](#visual-comparisons)
- [Configuration](#configuration)
  - [Modify context options](#modify-context-options)
  - [Skip tests with annotations](#skip-tests-with-annotations)
  - [Export JUnit report](#export-junit-report)

## Get started

### Installation

```sh
npm i -D @playwright/test
```

### Write a test

Create `foo.spec.ts` to define your test. The test function uses the [`page`](https://playwright.dev/#path=docs%2Fapi.md&q=class-page) argument for browser automation.

```js
import { it, expect } from "@playwright/test";

it("is a basic test with the page", async ({ page }) => {
  await page.goto("https://playwright.dev/");
  const name = await page.innerText(".navbar__title");
  expect(name).toBe("Playwright");
});
```

#### Default arguments

The test runner provides browser primitives as arguments to your test functions. Test functions can use one or more of these arguments.

- `page`: Instance of [Page](https://playwright.dev/#path=docs%2Fapi.md&q=class-page). Each test gets a new isolated page to run the test.
- `context`: Instance of [BrowserContext][browser-context]. Each test gets a new isolated context to run the test. The `page` object belongs to this context.
  - `contextOptions`: Default options passed to context creation. Learn [how to modify them](#modify-context-options).
- `browser`: Instance of [Browser](https://playwright.dev/#path=docs%2Fapi.md&q=class-browser). Browsers are shared across tests to optimize resources. Each worker process gets a browser instance.
  - `browserOptions`: Default options passed to browser creation.

#### Specs and assertions

- Use `it` and `describe` to write test functions. Run a single test with `it.only` and skip a test with `it.skip`.
- For assertions, use the [`expect` API](https://jestjs.io/docs/en/expect).

```js
const { it, describe } = require("@playwright/test");

describe("feature foo", () => {
  it("is working correctly", async ({ page }) => {
    // Test function
  });
});
```

### Run the test

Tests can be run on single or multiple browsers and with flags to generate screenshot on test failures.

```sh
# Run all tests across Chromium, Firefox and WebKit
npx folio

# Run tests on a single browser
npx folio --param browserName=chromium

# Run all tests in headful mode
npx folio --param headful

# Run tests with slowMo (slows down Playwright operations by n milliseconds)
npx folio --param slowMo=100

# Save screenshots on failure in test-results directory
npx folio --param screenshotOnFailure

# Record videos
npx folio --param video

# Retry test failures
npx folio --retries 3

# See all options
npx folio --help
```

Test runner CLI can be customized with [Folio parameters][folio-parameters].

#### Configure NPM scripts

Save the run command as an NPM script.

```json
{
  "scripts": {
    "test": "npx folio --param screenshotOnFailure"
  }
}
```

-----------

## Examples

### Multiple pages

The default `context` argument is a [BrowserContext][browser-context]. Browser contexts are isolated execution environments that can host multiple pages. See [multi-page scenarios][multi-page] for more examples.

```js
import { it } from "@playwright/test";

it("tests on multiple web pages", async ({ context }) => {
  const pageFoo = await context.newPage();
  const pageBar = await context.newPage();
  // Test function
});
```

### Mobile emulation

The `contextOptions` fixture defines default options used for context creation. This fixture can be overriden to configure mobile emulation in the default `context`.

```js
import { folio } from "@playwright/test";
import { devices } from "playwright";

const fixtures = folio.extend();
fixtures.contextOptions.override(async ({ contextOptions }, runTest) => {
  await runTest({
    ...contextOptions,
    ...devices["iPhone 11"]
  });
});
const { it, describe, extend } = fixtures.build();

it("uses mobile emulation", async ({ context }) => {
  // Test function
});
```

### Network mocking

Define a custom argument that mocks networks call for a browser context.

```js
// In fixtures.ts
import { folio as base } from "@playwright/test";
import { BrowserContext } from "playwright";

// Extend base fixtures with a new test-level fixture
const fixtures = base.extend<{ mockedContext: BrowserContext }>();

fixtures.mockedContext.init(async ({ context }, runTest) => {
  // Modify existing `context` fixture to add a route
  context.route(/.css/, route => route.abort());
  // Pass fixture to test functions
  runTest(context);
});

export folio = fixtures.build();
```

```js
// In foo.spec.ts
import { folio } from "./fixtures";
const { it, expect } = folio;

it("loads pages without css requests", async ({ mockedContext }) => {
  const page = await mockedContext.newPage();
  await page.goto("https://stackoverflow.com");
  // Test function code
});
```

### Visual comparisons

The `expect` API supports visual comparisons with `toMatchSnapshot`. This uses the [pixelmatch](https://github.com/mapbox/pixelmatch) library, and you can pass `threshold` as an option.

```js
import { it, expect } from "@playwright/test";

it("compares page screenshot", async ({ page, browserName }) => {
  await page.goto("https://stackoverflow.com");
  const screenshot = await page.screenshot();
  expect(screenshot).toMatchSnapshot(`test-${browserName}.png`, { threshold: 0.2 });
});
```

On first execution, this will generate golden snapshots. Subsequent runs will compare against the golden snapshots. To update golden snapshots with new actuals, run with the `--update-snapshots` flag.

```sh
# Update golden snapshots when they differ from actual
npx folio --update-snapshots
```

-----------

## Configuration

### Modify context options

You can modify the built-in fixtures. This example modifies the default `contextOptions` with a custom viewport size.

**Step 1**: Create a new file (say `test/fixtures.ts`) which contains our modifications.

```ts
// test/fixtures.ts
import { folio as baseFolio } from "@playwright/test";

const builder = baseFolio.extend();

// Fixture modifications go here

const folio = builder.build();
```

**Step 2**: Override the existing `contextOptions` fixture to configure viewport size and HTTPS error handling.

```diff
// test/fixtures.ts
import { folio as baseFolio } from "@playwright/test";
+ import { BrowserContextOptions } from "playwright";

const builder = baseFolio.extend();

+ builder.contextOptions.override(async ({ contextOptions }, runTest) => {
+   const modifiedOptions: BrowserContextOptions = {
+     ...contextOptions, // Default options
+     viewport: { width: 1440, height: 900 },
+     ignoreHTTPSErrors: true
+   }
+   await runTest(modifiedOptions);
+ });

const folio = builder.build();
```

**Step 3**: Export `it` and other helpers from the modified fixtures. In your test files, import the modified fixture.

```diff
// test/fixtures.ts
import { folio as baseFolio } from "@playwright/test";
import { BrowserContextOptions } from "playwright";

const builder = baseFolio.extend();

builder.contextOptions.override(async ({ contextOptions }, runTest) => {
  const modifiedOptions: BrowserContextOptions = {
    ...contextOptions, // default
    viewport: { width: 1440, height: 900 }
  }
  await runTest(modifiedOptions);
});

const folio = builder.build();

+ export const it = folio.it;
+ export const expect = folio.expect;
```

```ts
// test/index.spec.ts
import { it, expect } from "./fixtures";

// Test functions go here
it("should have modified viewport", async ({ context }) => {
  // ...
});
```

### Skip tests with annotations

The Playwright test runner can annotate tests to skip under certain parameters. This is enabled by [Folio annotations][folio-annotations].

```js
it("should be skipped on firefox", (test, { browserName }) => {
  test.skip(browserName === "firefox", "optional description for the skip")
}, async ({ page, browserName }) => {
  // Test function
});
```

### Export JUnit report

The Playwright test runner supports various reporters, including exporting as a JUnit compatible XML file.

```sh
# Specify output file as an environment variable
# Linux/macOS
export FOLIO_JUNIT_OUTPUT_NAME=junit.xml
# Windows
set FOLIO_JUNIT_OUTPUT_NAME=junit.xml

# Use junit and CLI reporters
npx folio --reporter=junit,line

# See all supported reporters
npx folio --help
```

[browser-opts]: https://playwright.dev/#path=docs%2Fapi.md&q=browsertypelaunchoptions
[context-opts]: https://playwright.dev/#path=docs%2Fapi.md&q=browsernewcontextoptions
[multi-page]: https://playwright.dev/#path=docs%2Fmulti-pages.md&q=
[browser-context]: https://playwright.dev/#path=docs%2Fapi.md&q=class-browsercontext
[folio-annotations]: https://github.com/microsoft/folio#annotations
[folio-parameters]: https://github.com/microsoft/folio#parameters
