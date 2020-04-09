# 🎭 Playwright Jest Runners

> This repository is not ready for use. If you want to run tests with [playwright](https://github.com/Microsoft/playwright), checkout [jest-playwright](https://github.com/mmarkelov/jest-playwright) for Jest or [karma-playwright-launcher](https://github.com/JoelEinbinder/karma-playwright-launcher) for Karma.

To provide the best web testing experience, we need to write our own web test runner. To make the test runner, we use the [jest platform](https://www.youtube.com/watch?v=NtjyeojAOBs).

![Diagram](./docs/diagram.png)

The runner comes in two flavors:

- **jest-runner-playwright-e2e** Tests run in node, and control one or more web pages. Code coverage and other metadata is taken from the browser, rather than node. One node process is used to connect to mulitple parallel browser processes.

- **jest-runner-playwright-unit** Tests run in the browser. Code is transformed from node-style to web-style on the fly. This is a mostly drop-in replacement for JSDOM. Perliminary tests show this to be faster to startup and faster to run than JSDOM code!

## Todo List
- [ ] run tests in e2e mode
    - [x] expect
    - [x] it/describe
    - [ ] skip/focus tests
    - [x] watch mode
    - [x] playwright
    - [ ] state
    - [ ] beforeEach/afterEach/beforeAll/afterAll
- [ ] run tests in unit mode
- [ ] parallel
- [ ] multiple browsers
- [ ] code coverage
- [ ] describes
- [ ] devices
- [x] transform code
- [ ] typescript definitions
- [ ] screenshots
- [ ] expect from the page
- [ ] benchmarks
- [ ] templates
- [ ] run [create-react-app](https://github.com/facebook/create-react-app) test
- [ ] run [excalidraw](https://github.com/excalidraw/excalidraw) tests

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

