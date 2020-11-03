# Authentication

This doc covers how to configure a setup phase that authenticates a user. The goal is to login once and re-use authentication state to minimize the time spent in authenticating.

- [Building blocks](#building-blocks)
- [Run all tests with authentication](#run-all-tests-with-authentication)
- [Run some tests with authentication](#run-some-tests-with-authentication)
- [Multiple user profiles](#multiple-user-profiles)
- [Extend beyond cookies](#extend-beyond-cookies)

## Building blocks

### Built-in arguments

Playwright test runner provides arguments like `context` and `page` to every test function. We will modify these arguments to configure authentication. See all [built-in arguments][default-args].

- `page`: Instance of [Page][page]. Each test gets a new isolated page to run the test.
- `context`: Instance of [BrowserContext][browser-context]. Each test gets a new isolated context to run the test. The `page` object belongs to this context.

### Authentication function

The authentication function (e.g. `doLogin`) depends on your app: you can login with the UI or through backend APIs. At the end of a successful login, the browser page is authenticated.

The authentication state is stored as cookies on the page. If your app uses other storage, see [other storage options](#extend-beyond-cookies).

```js
// In tests/common/auth.ts

export async function doLogin(page) {
  // Interact with UI elements to submit login form
  await page.fill('#username', process.env.USERNAME);
  await page.fill('#password', process.env.PASSWORD);
  await page.click('text=Login');
  // Page is now logged in
}
```

## Run all tests with authentication

We override the built-in arguments such that the `context` and `page` passed to the test functions are in logged in state. These arguments are defined as fixtures. There are two types of fixtures:

- Test-level fixtures: These fixtures are created for every test function that uses them.
  - `context` and `page` are test-level fixtures.
- Worker-level fixtures: A worker process is a unit of parallelization and runs a set of tests. Worker-level fixtures are run once per worker.

In this example, we will create a worker-level fixture called `loggedInState` and use that to create test-level fixtures for `context` and `page`.

```ts
// In tests/fixtures.ts
import { folio as baseFolio } from '@playwright/test';
import { doLogin } from './common/auth.ts';

// Extend built-in fixtures and declare types for new fixtures
const builder = baseFolio.extend<{}, { loggedInState: any }>();


// Create a fixture which is executed only once per worker
builder.loggedInState.init(async ({ browser }, runTest) => {
  // Use the built-in browser fixture
  const page = await browser.newPage();
  await doLogin(page);
  
  // Extract cookies after successful login
  const cookies = await page.context().cookies();
  const state = { cookies };
  
  // Pass this state to other fixtures/tests that depend on loggedInState
  runTest(state);
  
  // Define fixture scope to worker
}, {scope: 'worker'});


// Override the existing context fixture
builder.context.override(async ({ context, loggedInState }, runTest) => {
  // Load the state in the context
  const { cookies } = loggedInState;
  await context.addCookies(cookies);
  
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
// In tests/feature.spec.ts
import { it, expect } from './fixtures';

it('should be logged in', async ({ page }) => {
  // page comes from the modified context object
});
```

## Run some tests with authentication

To support test suites that require authentication for some tests, we can create authenticated equivalents of the built-in `context` and `page` fixtures.

| Fixtures without auth | Fixtures with auth |
|--------------------|-----------------|
| `context`, `page` (built-ins)  | `loggedInContext`, `loggedInPage` |

```ts
// In tests/fixtures.ts
import { folio as baseFolio } from '@playwright/test';
import { Page, BrowserContext } from 'playwright';
import { doLogin } from './common/auth.ts';

// Extend built-in fixtures and declare types for new fixtures
const builder = baseFolio.extend<{ loggedInContext: BrowserContext, loggedInPage: Page }, { loggedInState: any }>();


// Create a fixture which is executed only once per worker
builder.loggedInState.init(async ({ browser }, runTest) => {
  // Use the built-in browser fixture
  const page = await browser.newPage();
  await doLogin(page);
  
  // Extract cookies after successful login
  const cookies = await page.context().cookies();
  const state = { cookies };
  
  // Pass this state to other fixtures/tests that depend on loggedInState
  runTest(state);
  
  // Define fixture scope to worker
}, {scope: 'worker'});


// Create fixture for logged in browser context
builder.loggedInContext.init(async ({ context, loggedInState }, runTest) => {
  // Load the state in the context
  const { cookies } = loggedInState;
  await context.addCookies(cookies);
  
  // Pass the modified context to other fixtures/tests that depend on loggedInContext
  runTest(context);
});


// Create fixture for logged in page
builder.loggedInPage.init(async ({ loggedInContext }, runTest) => {
  const page = await loggedInContext.newPage();
  
  // Pass the page to other fixtures/tests that depend on loggedInPage
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

it('should not be logged in', async ({ page }) => {
  // page comes from built-in context
});

it('should be logged in', async ({ loggedInPage }) => {
  // loggedInPage comes from loggedInContext
});
```

## Multiple user profiles

For test suites that require multiple user profiles, fixtures that can be created for every user profile. For example, you can create two page objects, one for admin users and the other for guest users. This way your tests can "ask" for the page they need, which would be lazily setup for them.

```js
// In tests/feature.spec.ts
import { it, expect } from './fixtures';

it('should not be logged in', async ({ page }) => {
  // page comes from built-in context
});

it('should be logged in as admin user', async ({ adminPage }) => {
  // ...
});

it('should be logged in as guest user', async ({ guestPage }) => {
  // ...
});
```

## Extend beyond cookies

In addition to cookies, applications can also rely on local or session storage to represent authentication state. The examples above can be modified to extend beyond cookies. [Learn more][auth-upstream] on how this can be done.


[default-args]: ../README.md#default-arguments
[page]: https://playwright.dev/#path=docs%2Fapi.md&q=class-page
[browser-context]: https://playwright.dev/#path=docs%2Fapi.md&q=class-browsercontext
[auth-upstream]: https://playwright.dev/#path=docs%2Fauth.md&q=
[login-once-example]: ../examples/login-once-per-worker