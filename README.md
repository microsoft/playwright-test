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

Run all tests with

```
npx test-runner
```

## Execution options
```
npx test-runner --help
```


