# Network mocking

Playwright comes with powerful [network interception][network-upstream] capabilities. This doc shows how these capabilities can be used to configure network mocking in a test suite.

- [Mocking with a CLI parameter](#mocking-with-a-cli-parameter): This sets up a CLI flag (`--param enableMocks`) that conditionally enables network mocking for your tests.
- [Mocking for some tests](#network-mocks-for-some-tests): This sets up a page with network mocking for your test functions.

## Mocking with a CLI parameter

Playwright test runner can configure custom CLI parameters or flags. In this example, we will create a new parameter to enable network mocks.

```sh
# Run tests with network mocks
$ npx folio --param enableMocks
$ npx folio -p enableMocks

# Run tests without network mocks
$ npx folio
```

Extend the built-in folio object to add a new parameter and modify the built-in `context` fixture with network mocks. `context` is an instance of [BrowserContext][browser-context] which can host multiple pages.

```ts
// In tests/fixtures.ts
import { folio as baseFolio } from '@playwright/test';

// Extend built-in folio and declare types for new parameters
const builder = baseFolio.extend<{}, {}, { enableMocks: boolean }>();

// Define parameter with description and default value
builder.enableMocks.initParameter('Set to true to enable network mocking', false);

// Modify built-in context fixture
builder.context.override(async ({ context, enableMocks }, runTest) => {
  if (enableMocks) {
    // Use route API to define mocks
    await context.route('**/api/users', route => route.fulfill({
      status: 200,
      body: testData,
    }));
  }

  // Pass the modified context to other fixtures/tests that depend on context
  runTest(context);
});

// Build and export the modified fixtures
const folio = builder.build();
export it = folio.it;
export expect = folio.expect;
```

Your test files can then import these modified fixtures and use them inside test functions.

```js
// In tests/features.spec.ts
import { it, expect } from './fixtures';

it('verifies feature bar works', async ({ context }) => {
  // context is overriden by our modification
  const page = await context.newPage();
  // ...
});

it('verifies feature foo works', async ({ page }) => {
  // page comes from the modified context object
});
```

When `--param enableMocks` is passed, network mocking will be enabled across all tests.

## Network mocks for some tests

To support test suites that require network mocks for some tests, we can create mocked equivalents of the built-in `context` and `page` fixtures.

| Fixtures without mocks | Fixtures with mocks |
|--------------------|-----------------|
| `context`, `page` (built-ins)  | `mockedContext`, `mockedPage` |

```ts
// In tests/fixtures.ts
import { folio as baseFolio } from '@playwright/test';
import { Page, BrowserContext } from 'playwright';

// Extend built-in fixtures and declare types for new fixtures
const builder = baseFolio.extend<{ mockedContext: BrowserContext, mockedPage: Page }>();


// Create fixture for mocked browser context
builder.mockedContext.init(async ({ context }, runTest) => {
  // Use route API to define mocks
  await context.route('**/api/users', route => route.fulfill({
    status: 200,
    body: testData,
  }));
  
  // Pass the modified context to other fixtures/tests that depend on mockedContext
  runTest(context);
});


// Create fixture for mocked page
builder.mockedPage.init(async ({ mockedContext }, runTest) => {
  const page = await mockedContext.newPage();
  
  // Pass the page to other fixtures/tests that depend on mockedPage
  runTest(page);
});


// Build and export the modified fixtures
const folio = builder.build();
export it = folio.it;
export expect = folio.expect;
```

Your test files can then import these modified fixtures and use them inside test functions.

```js
// In tests/feature.spec.ts
import { it, expect } from './fixtures';

it('should not have network mocks', async ({ page }) => {
  // page comes from built-in context
});

it('should have network mocks', async ({ mockedPage }) => {
  // mockedPage comes from mockedContext
});
```

[network-upstream]: https://playwright.dev/#path=docs%2Fnetwork.md&q=
[browser-context]: https://playwright.dev/#path=docs%2Fapi.md&q=class-browsercontext
