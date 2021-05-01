## Migration from version 0.1111.0

### Test syntax

- `it` function has been renamed to `test`. Although `it` alias is still available, we suggest to use `test`.
- `beforeEach`, `afterEach`, `beforeAll`, `afterAll`, `expect` and `describe` are exposed directly on the `test` function. Old aliases still work, but we suggest to use `test.beforeEach` and similar.

```ts
// Old syntax
import { it, expect, beforeEach } from "@playwright/test";
beforeEach(() => {});
it('should work', () => {
  expect(1 + 1).toBe(2);
});

// New syntax
import { test, expect } from "@playwright/test";
test.beforeEach(() => {});
test('should work', () => {
  expect(1 + 1).toBe(2);
});
```

### Configuration file

The main change is the introduction of [configuration file](../README.md#configuration). Here you configure browser launch, context creation and testing options. You can also create multiple projects to your liking, and examples suggest one project for each of Chromium, Firefox and WebKit browsers.

```ts
import { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  timeout: 30000,  // Each test is given 30 seconds.

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 720 },
      },
    },

    {
      name: 'webkit',
      use: {
        browserName: 'webkit',
        headless: true,
        viewport: { width: 1280, height: 720 },
      },
    },

    {
      name: 'firefox',
      use: {
        browserName: 'firefox',
        headless: true,
        viewport: { width: 1280, height: 720 },
      },
    }
  ],
};
export default config;
```

### Options

With configuration file, you can specify options globally for the whole test suite - see example above. In addition to that, test files can specify options locally.

```ts
// my.spec.ts
import { test, expect } from "@playwright/test";

// Run tests in this file with portrait-like viewport.
test.use({ viewport: { width: 600, height: 900 } });

test('my test', async ({ page }) => {
  // Test code goes here.
});
```

### Other Folio changes

If you are using custom fixtures, parameters, annotations or any other advanced Folio features, consider reading the [Folio migration guide](https://github.com/microsoft/folio/docs/migration-from-0.3.18.md).
