# 🎭 Playwright Runner
> :warning: **WARNING:** For testing in production please refer to the [Test runners](https://github.com/microsoft/playwright/blob/master/docs/test-runners.md) document. This repository contains experimental work where we explore custom Jest runners and JSDom-alike component testing that uses real browsers.

## Usage

1. `npm i --save-dev jest playwright-runner ` or `yarn add --dev jest playwright-runner`
2. Specify `playwright-runner` in your Jest configuration:
```js
// jest.config.js
module.exports = {
  "preset": "playwright-runner"
}
```
3. Place unit tests in files ending with `.spec.*` or `.test.*`.
```js
// src/App.spec.jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './App';

it('should work', function() {
  const container = document.createElement('div');
  ReactDOM.render(<App />, container);
  expect(container.textContent).toBe('Hello World');
});
```
4. Place end-to-end tests inside an `e2e` folder.
```js
// e2e/basic.test.js
it('is a basic test with the page', async ({page}) => {
  await page.goto('https://github.com/microsoft/playwright-runner/blob/master/README.md');
  const title = await page.waitForSelector('article h1');
  expect(await title.textContent()).toBe('🎭 Playwright Runner');
});
```
5. Run all of your tests with `npx jest` or `yarn jest`

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

