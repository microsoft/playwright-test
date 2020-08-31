# 🎭 Playwright Runner
> :warning: **WARNING:** For testing in production please refer to the [Test runners](https://github.com/microsoft/playwright/blob/master/docs/test-runners.md) document. This repository contains an experimental test runner.

## Usage

1. `npm i -D playwright-runner`
2. Place unit tests in files ending with `.spec.*`.
```js
// src/foo.spec.ts
import 'playwright-runner';

it('is a basic test with the page', async ({page}) => {
  await page.goto('https://playwright.dev/');
  expect(await page.innerText('.home-navigation')).toBe('🎭 Playwright');
});
```
3. Run all of your tests with `npx test-runner .`

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

