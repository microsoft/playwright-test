const babel = require('@babel/core');

/**
 * @param {string} code
 * @return {Promise<string>}
 */
async function transform(code) {
  const output = await babel.transformAsync(code, {
    cwd: __dirname,
    plugins: [babel.createConfigItem(require('..'))]
  });
  return /** @type {string} */ (output && output.code);
}

it('should not mess up simple code', async () => {
  const out = await transform('const x = 5;');
  expect(out).toBe('const x = 5;');
});

it('should work leave no extension alone', async () => {
  const out = await transform(`import "./something";`);
  expect(out).toBe('import "./something";');
});

it('should leave a .ts extension alone', async () => {
  const out = await transform(`import "./something.ts";`);
  expect(out).toBe('import "./something.ts";');
});

it('should leave a .js extension alone', async () => {
  const out = await transform(`import "./something.js";`);
  expect(out).toBe('import "./something.js";');
});

it('should transform third party files', async () => {
  const out = await transform(`import "something";`);
  expect(out).toBe('import "https://third_party/something";');
});

it('should transform third party files with a folder', async () => {
  const out = await transform(`import "@something/types";`);
  expect(out).toBe('import "https://third_party/@something/types";');
});

it('should transform import from', async () => {
  const out = await transform(`import { something } from "something";`);
  expect(out).toBe('import { something } from "https://third_party/something";');
});

it('should transform export', async () => {
  const out = await transform(`export { something } from "something";`);
  expect(out).toBe('export { something } from "https://third_party/something";');
});

it('should transform export all ', async () => {
  const out = await transform(`export * from "something";`);
  expect(out).toBe('export * from "https://third_party/something";');
});
