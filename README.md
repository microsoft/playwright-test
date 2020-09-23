# 🎭 Playwright Runner
> ⚠️ **WARNING:** For testing in production please refer to the [Test runners](https://github.com/microsoft/playwright/blob/master/docs/test-runners.md) document. This repository contains an experimental test runner.

## Features

- Support for Javascript and TypeScript
- Abstracted logic support for running logic before and after a test called fixtures
- New Playwright Context for each new test
- Integration for running multiple browsers / devices via CLI and environment variables

## Installation

```
npm i -D playwright-runner
```

## Usage

Place unit tests in files ending with `.spec.*`.

```js
// src/foo.spec.ts
import 'playwright-runner';

it('is a basic test with the page', async ({page}) => {
  await page.goto('https://playwright.dev/');
  expect(await page.innerText('.home-navigation')).toBe('🎭 Playwright');
});
```

Run all of your tests with `npx test-runner`

## Examples

- [Using JavaScript](./basic-js)
- [Using TypeScript](./basic-ts)
- [Recording Playwright tests (Chromium only)](./record-video)
- [Creating screenshots on failure](./screenshot-on-failure)
- [Run multiple browsers / devices](./browser-device-matrix)
