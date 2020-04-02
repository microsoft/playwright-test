# jest-runner-playwright-unit

1. The users test code, for example `something.spec.tsx`, is compiled into modern javascript with es6 imports.
2. The compiled test code is run directly in the browser.
3. The test code imports something. Playwright intercepts the http request and...
    - if it is local, such as `import './App.tsx'`, that new file is compiled to modern javascript and returned.
    - if it is a module, such as `import 'react'`, the parent node process is used to resolve the module. Browserify is used to bundle it, and the bundle is returned.

