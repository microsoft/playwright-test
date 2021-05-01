# ⚠️ This project is not ready for production. Stay tuned! ⚠️

# 🎭 Playwright test runner [![npm version](https://img.shields.io/npm/v/@playwright/test.svg?style=flat)](https://www.npmjs.com/package/@playwright/test)

Cross-browser end-to-end testing for web apps. Browser automation with [Playwright](https://playwright.dev), Jest-like assertions and built-in support for TypeScript.

Playwright test runner is **available in preview** and minor breaking changes could happen. We welcome your feedback to shape this towards 1.0.

- [Get started](#get-started)
  - [Installation](#installation)
  - [Write a test](#write-a-test)
  - [Tests and assertions syntax](#tests-and-assertions-syntax)
  - [Write a configuration file](#write-a-configuration-file)
  - [Run the test suite](#run-the-test-suite)
- [Examples](#examples)
  - [Multiple pages](#multiple-pages)
  - [Mobile emulation](#mobile-emulation)
  - [Network mocking](#network-mocking)
  - [Visual comparisons](#visual-comparisons)
  - [Page object model](#page-object-model)
- [Configuration](#configuration)
  - [Modify options](#modify-options)
  - [Skip tests with annotations](#skip-tests-with-annotations)
  - [Run tests in parallel](#run-tests-in-parallel)
  - [Reporters](#reporters)

## Get started

### Installation

```sh
npm i -D @playwright/test
```

### Write a test

Create `tests/example.spec.ts` to define your test. The test function uses the [`page`][page] argument for browser automation.

```js
// tests/example.spec.js
const { test, expect } = require("@playwright/test");

test("is a basic test with the page", async ({ page }) => {
  await page.goto("https://playwright.dev/");
  const name = await page.innerText(".navbar__title");
  expect(name).toBe("Playwright");
});
```

<details>
  <summary> TypeScript version </summary>

  ```ts
  // tests/example.spec.ts
  import { test, expect } from "@playwright/test";

  test("is a basic test with the page", async ({ page }) => {
    await page.goto("https://playwright.dev/");
    const name = await page.innerText(".navbar__title");
    expect(name).toBe("Playwright");
  });
  ```
</details>
<br>

Playwright test runner is based on the [Folio] framework, and includes all the features available in Folio. For example, Playwright test runner provides test fixtures for browser primitives.

These browser primitives are available as arguments to your test functions, and can be used one by one or together.

- `page`: Instance of [Page][page]. Each test gets a new isolated page to run the test.
- `context`: Instance of [BrowserContext][browser-context]. Each test gets a new isolated context to run the test. The `page` object belongs to this context. Learn [how to configure](#modify-options) context creation.
- `browser`: Instance of [Browser][browser]. Browsers are shared across tests to optimize resources. Learn [how to configure](#modify-options) browser launch.
- `browserName`: The name of the browser currently running the test. Either `chromium`, `firefox` or `webkit`.

You can now run the test using the underlying [Folio] command line:

```sh
# Assuming that test files are in the tests directory.
npx folio -c tests
```

### Tests and assertions syntax

- Use `test` to write test functions. Run a single test with `test.only` and skip a test with `test.skip`.
- Use `test.describe` to group related tests together.
- Use `test.beforeAll` and `test.afterAll` hooks to set up and tear down resources shared between tests.
- Use `test.beforeEach` and `test.afterEach` hooks to set up and tear down resources for each test individually.
- For assertions, use the [`expect` API](https://jestjs.io/docs/expect).

```js
// tests/example.spec.js
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

<details>
  <summary> TypeScript version </summary>

  ```ts
  // tests/example.spec.ts
  import { test, expect } from "@playwright/test";

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
</details>
<br>

### Write a configuration file

Create `folio.config.ts` file to configure your tests: specify browser launch options, run tests in multiple browsers and much more. Here is an example configuration that runs every test in Chromium, Firefox and WebKit.

```js
// folio.config.js
module.exports = {
  // Each test is given 30 seconds.
  timeout: 30000,

  // Test files are in the "tests" directory.
  testDir: 'tests',

  // A project per browser, each running all the tests.
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 720 },
      },
    },

    {
      name: 'webkit',
      use: {
        browserName: 'webkit',
        headless: true,
        viewport: { width: 1280, height: 720 },
      },
    },

    {
      name: 'firefox',
      use: {
        browserName: 'firefox',
        headless: true,
        viewport: { width: 1280, height: 720 },
      },
    }
  ],
};
```

<details>
  <summary> TypeScript version </summary>

  ```ts
  // folio.config.ts
  import { PlaywrightTestConfig } from "@playwright/test";

  const config: PlaywrightTestConfig = {
    // Each test is given 30 seconds.
    timeout: 30000,

    // Test files are in the "tests" directory.
    testDir: 'tests',

    // A project per browser, each running all the tests.
    projects: [
      {
        name: 'chromium',
        use: {
          browserName: 'chromium',
          headless: true,
          viewport: { width: 1280, height: 720 },
        },
      },

      {
        name: 'webkit',
        use: {
          browserName: 'webkit',
          headless: true,
          viewport: { width: 1280, height: 720 },
        },
      },

      {
        name: 'firefox',
        use: {
          browserName: 'firefox',
          headless: true,
          viewport: { width: 1280, height: 720 },
        },
      }
    ],
  };
  export default config;
  ```
</details>
<br>


### Run the test suite

Tests can be run in single or multiple browsers, in parallel or sequentially, using the underlying [Folio command line][folio-cli]:

- Run all tests across Chromium, Firefox and WebKit
  ```sh
  npx folio
  ```

- Run tests on a single browser
  ```sh
  npx folio --project=chromium
  ```

- Run tests sequentially
  ```sh
  npx folio --workers=1
  ```

- Retry failing tests
  ```sh
  npx folio --retries=2
  ```

- See all options
  ```sh
  npx folio --help
  ```

Refer to the [command line documentation][folio-cli] for all options.

#### Configure NPM scripts

Save the run command as an NPM script.

```json
{
  "scripts": {
    "test": "npx folio"
  }
}
```

-----------

## Examples

### Multiple pages

The default `context` argument is a [BrowserContext][browser-context]. Browser contexts are isolated execution environments that can host multiple pages. See [multi-page scenarios][multi-page] for more examples.

```js
// tests/example.spec.js
const { test } = require("@playwright/test");

test("tests on multiple web pages", async ({ context }) => {
  const pageFoo = await context.newPage();
  const pageBar = await context.newPage();
  // Test function
});
```

<details>
  <summary> TypeScript version </summary>

  ```ts
  // tests/example.spec.ts
  import { test } from "@playwright/test";

  test("tests on multiple web pages", async ({ context }) => {
    const pageFoo = await context.newPage();
    const pageBar = await context.newPage();
    // Test function
  });
  ```
</details>
<br>


### Mobile emulation

`use` section in the configuration file can be used to configure mobile emulation in the default `context`.

```js
// folio.config.js
const { devices } = require("playwright");

module.exports = {
  timeout: 30000,
  testDir: 'tests',
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        headless: true,
        ...devices["Pixel 2"],
      },
    },
  ],
};
```

<details>
  <summary> TypeScript version </summary>

  ```ts
  // folio.config.ts
  import { PlaywrightTestConfig } from "@playwright/test";
  import { devices } from "playwright";

  const config: PlaywrightTestConfig = {
    timeout: 30000,
    testDir: 'tests',
    projects: [
      {
        name: 'chromium',
        use: {
          browserName: 'chromium',
          headless: true,
          ...devices["Pixel 2"],
        },
      },
    ],
  };
  export default config;
  ```
</details>
<br>


### Network mocking

Define a custom route that mocks network calls for a browser context.

```js
// tests/example.spec.js
const { test, expect } = require("@playwright/test");

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

<details>
  <summary> TypeScript version </summary>

  ```ts
  // tests/example.spec.ts
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
</details>
<br>


### Visual comparisons

The `expect` API supports visual comparisons with `toMatchSnapshot`. This uses the [pixelmatch](https://github.com/mapbox/pixelmatch) library, and you can pass `threshold` as an option.

```js
// tests/example.spec.js
const { test, expect } = require("@playwright/test");

test("compares page screenshot", async ({ page }) => {
  await page.goto("https://stackoverflow.com");
  const screenshot = await page.screenshot();
  expect(screenshot).toMatchSnapshot(`test.png`, { threshold: 0.2 });
});
```

<details>
  <summary> TypeScript version </summary>

  ```ts
  // tests/example.spec.ts
  import { test, expect } from "@playwright/test";

  test("compares page screenshot", async ({ page }) => {
    await page.goto("https://stackoverflow.com");
    const screenshot = await page.screenshot();
    expect(screenshot).toMatchSnapshot(`test.png`, { threshold: 0.2 });
  });
  ```
</details>
<br>


On first execution, this will generate golden snapshots. Subsequent runs will compare against the golden snapshots. To update golden snapshots with new actuals, run with the `--update-snapshots` flag.

```sh
# Update golden snapshots when they differ from actual
npx folio --update-snapshots
```

### Page object model

To introduce a Page Object for a particular page, create a class that will use the `page` object.

Create a `LoginPage` helper class to encapsulate common operations on the login page.
```js
// tests/login-page.js
class LoginPage {
  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("https://example.com/login");
  }

  async login() {
    await this.page.fill("#username", TEST_USERNAME);
    await this.page.fill("#password", TEST_PASSWORD);
    await this.page.click("text=Login");
  }
}
exports.LoginPage = LoginPage;
```

<details>
  <summary> TypeScript version </summary>

  ```ts
  // tests/login-page.ts
  import type { Page } from "playwright";

  export class LoginPage {
    page: Page;

    constructor(page: Page) {
      this.page = page;
    }

    async goto() {
      await this.page.goto("https://example.com/login");
    }

    async login() {
      await this.page.fill("#username", TEST_USERNAME);
      await this.page.fill("#password", TEST_PASSWORD);
      await this.page.click("text=Login");
    }
  }
  ```
</details>
<br>


Use the `LoginPage` class in the tests.
```js
// tests/example.spec.js
const { test, expect } = require("@playwright/test");
const { LoginPage } = require("./login-page");

test("login works", async ({ page }) => {
  // Create the login page and perform operations.
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login();

  // Verify it worked.
  expect(await page.textContent("#user-info")).toBe("Welcome, Test User!");
});
```

<details>
  <summary> TypeScript version </summary>

  ```ts
  // tests/example.spec.ts
  import { test, expect } from "@playwright/test";
  import { LoginPage } from "./login-page";

  test("login works", async ({ page }) => {
    // Create the login page and perform operations.
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();

    // Verify it worked.
    expect(await page.textContent("#user-info")).toBe("Welcome, Test User!");
  });
  ```
</details>
<br>


-----------

## Configuration

### Modify options

You can modify browser launch options, context creation options and testing options either globally in the configuration file, or locally in the test file.

Playwright test runner is based on the [Folio] framework, so it supports any configuration available in Folio, and adds a lot of Playwright-specific options.

#### Globally in the configuration file

You can specify different options for each browser using projects in the configuration file. Below is an example that changes some global testing options, and Chromium browser configuration.

```js
// folio.config.js
module.exports = {
  // Each test is given 90 seconds.
  timeout: 90000,

  // Failing tests will be retried at most two times.
  retries: 2,

  // Test files are in the "tests" directory.
  testDir: 'tests',

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',

        // Launch options
        headless: false,
        slowMo: 50,

        // Context options
        viewport: { width: 800, height: 600 },
        ignoreHTTPSErrors: true,

        // Testing options
        video: 'retain-on-failure',
      },
    },
  ],
};
```

<details>
  <summary> TypeScript version </summary>

  ```ts
  // folio.config.ts
  import { PlaywrightTestConfig } from "@playwright/test";

  const config: PlaywrightTestConfig = {
    // Each test is given 90 seconds.
    timeout: 90000,

    // Failing tests will be retried at most two times.
    retries: 2,

    // Test files are in the "tests" directory.
    testDir: 'tests',

    projects: [
      {
        name: 'chromium',
        use: {
          browserName: 'chromium',

          // Launch options
          headless: false,
          slowMo: 50,

          // Context options
          viewport: { width: 800, height: 600 },
          ignoreHTTPSErrors: true,

          // Testing options
          video: 'retain-on-failure',
        },
      },
    ],
  };
  export default config;
  ```
</details>
<br>


#### Locally in the test file

With `test.use()` you can override some options for a file, or a `describe` block.

```js
// tests/example.spec.js
const { test, expect } = require("@playwright/test");

// Run tests in this file with portrait-like viewport.
test.use({ viewport: { width: 600, height: 900 } });

test('my test', async ({ page }) => {
  // Test code goes here.
});
```

<details>
  <summary> TypeScript version </summary>

  ```ts
  // tests/example.spec.ts
  import { test, expect } from "@playwright/test";

  // Run tests in this file with portrait-like viewport.
  test.use({ viewport: { width: 600, height: 900 } });

  test('my test', async ({ page }) => {
    // Test code goes here.
  });
  ```
</details>
<br>


#### Available options

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

Most notable testing options from [Folio documentation][folio]:
- `forbidOnly: boolean` - Whether to exit with an error if any tests are marked as `test.only`. Useful on CI.
- `reporter: 'dot' | 'line' | 'list'` - Choose a reporter: minimalist `dot`, concise `line` or detailed `list`. See [Folio reporters][folio-reporters] for more details.
- `retries: number` - Each failing test will be retried up to the certain number of times.
- `testDir: string` - Directory where test runner should search for test files.
- `testMatch: (string | RegExp)[]` - Patterns to find test files, for example `/.*spec\.js/`.
- `testIgnore: (string | RegExp)[]` - Patterns to ignore when looking for test files, for example `/test_assets/`.
- `timeout: number` - Timeout in milliseconds for each test.
- `workers: number` - The maximum number of worker processes to run in parallel.

### Skip tests with annotations

The Playwright test runner can annotate tests to skip under certain parameters. This is enabled by [Folio annotations][folio-annotations].

```js
// tests/example.spec.js
const { test, expect } = require("@playwright/test");

test("should be skipped on firefox", async ({ page, browserName }) => {
  test.skip(browserName === "firefox", "optional description for the skip");
  // Test function
});
```

<details>
  <summary> TypeScript version </summary>

  ```ts
  // tests/example.spec.ts
  import { test, expect } from "@playwright/test";

  test("should be skipped on firefox", async ({ page, browserName }) => {
    test.skip(browserName === "firefox", "optional description for the skip");
    // Test function
  });
  ```
</details>
<br>


### Run tests in parallel

Tests are run in parallel by default, using multiple worker processes. You can control the parallelism with the `workers` option in the configuration file or from the command line.

- Run just a single test at a time - no parallelization
  ```sh
  npx folio --workers=1
  ```

- Run up to 10 tests in parallel
  ```sh
  npx folio --workers=10
  ```

- Different value for CI
  ```js
  // folio.config.js
  module.exports = {
    // No parallelization on CI, default value locally
    worker: process.env.CI ? 1 : undefined,
    testDir: 'tests',
    projects: [
      // Your projects go here
    ],
  };
  ```

  <details>
    <summary> TypeScript version </summary>

    ```ts
    // folio.config.ts
    import { PlaywrightTestConfig } from "@playwright/test";

    const config: PlaywrightTestConfig = {
      // No parallelization on CI, default value locally
      worker: process.env.CI ? 1 : undefined,
      testDir: 'tests',
      projects: [
        // Your projects go here
      ],
    };
    export default config;
    ```
  </details>
  <br>


By default, test runner chooses the number of workers based on available CPUs.

### Reporters

Playwright test runner comes with a few built-in reporters for different needs and ability to provide custom reporters. The easiest way to try out built-in reporters is to pass `--reporter` [command line option](#command-line). Built-in terminal reporters are minimalist `dot`, concise `line` and detailed `list`.

```sh
npx folio --reporter=line
npx folio --reporter=dot
npx folio --reporter=list
```

Alternatively, you can specify the reporter in the configuration file.
```js
// folio.config.js
module.exports = {
  // Concise 'dot' on CI, more interactive 'list' when running locally
  reporter: process.env.CI ? 'dot' : 'line',
  testDir: 'tests',
  projects: [
    // Your projects go here
  ],
};
```

<details>
  <summary> TypeScript version </summary>

  ```ts
  // folio.config.ts
  import { PlaywrightTestConfig } from "@playwright/test";

  const config: PlaywrightTestConfig = {
    // Concise 'dot' on CI, more interactive 'list' when running locally
    reporter: process.env.CI ? 'dot' : 'line',
    testDir: 'tests',
    projects: [
      // Your projects go here
    ],
  };
  export default config;
  ```
</details>
<br>

#### Export JUnit or JSON report

The Playwright test runner includes reporters that produce a JUnit compatible XML file or a JSON file with test results.

```js
// folio.config.js
module.exports = {
  testDir: 'tests',
  reporter: [
    // Live output to the terminal
    'list',
    // JUnit compatible xml report
    { name: 'junit', outputFile: 'report.xml' },
    // JSON file with test results
    { name: 'json', outputFile: 'report.json' },
  ],
  projects: [
    // Your projects go here
  ],
};
```

<details>
  <summary> TypeScript version </summary>

  ```ts
  // folio.config.ts
  import { PlaywrightTestConfig } from "@playwright/test";

  const config: PlaywrightTestConfig = {
    testDir: 'tests',
    reporter: [
      // Live output to the terminal
      'list',
      // JUnit compatible xml report
      { name: 'junit', outputFile: 'report.xml' },
      // JSON file with test results
      { name: 'json', outputFile: 'report.json' },
    ],
    projects: [
      // Your projects go here
    ],
  };
  export default config;
  ```
</details>
<br>


[multi-page]: https://playwright.dev/docs/multi-pages
[browser]: https://playwright.dev/docs/api/class-browser
[browser-context]: https://playwright.dev/docs/api/class-browsercontext
[page]: https://playwright.dev/docs/api/class-page
[folio]: https://github.com/microsoft/folio
[folio-annotations]: https://github.com/microsoft/folio#annotations
[folio-cli]: https://github.com/microsoft/folio#command-line
[folio-reporters]: https://github.com/microsoft/folio#reporters
