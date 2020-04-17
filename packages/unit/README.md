# jest-runner-playwright-unit

A jest runner that runs unit tests with [playwright](https://github.com/Microsoft/playwright).

> This package is not ready for use. If you want to run tests with playwright, checkout [jest-playwright](https://github.com/mmarkelov/jest-playwright) for Jest or [karma-playwright-launcher](https://github.com/JoelEinbinder/karma-playwright-launcher) for Karma.

1. The users test code, for example `something.spec.tsx`, is compiled into modern javascript with es6 imports.
2. The compiled test code is run directly in the browser.
3. The test code imports something. Playwright intercepts the http request and...
    - if it is local, such as `import './App.tsx'`, that new file is compiled to modern javascript and returned.
    - if it is a module, such as `import 'react'`, the parent node process is used to resolve the module. Browserify is used to bundle it, and the bundle is returned.

