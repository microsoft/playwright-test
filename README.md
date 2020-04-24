# 🎭 Playwright Runner
> This repository is not ready for use. If you want to run tests with [playwright](https://github.com/Microsoft/playwright), checkout [jest-playwright](https://github.com/mmarkelov/jest-playwright) for Jest or [karma-playwright-launcher](https://github.com/JoelEinbinder/karma-playwright-launcher) for Karma.

## Usage

1. `npm i --save-dev jest playwright-runner ` or `yarn add --dev jest playwright-runner`
2. Specify `playwright-runner` in your Jest configuration:
```json
//jest.config.js
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
  await page.goto('https://playwright.dev/');
  const home = await page.waitForSelector('home-navigation');
  expect(await home.evaluate(home => home.innerText)).toBe('🎭 Playwright');
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

