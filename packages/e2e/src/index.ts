import {TestWorker} from 'describers';
import * as globals from './globals';
import playwright from 'playwright';
import {createSuite, beforeEach, afterEach} from 'describers';
import path from 'path';
import {validate} from 'jest-validate';
import {createJestRunner} from '@playwright/jest-wrapper';

// TODO: figure out hook timeouts.
const NoHookTimeouts = 0;

async function runTasksConcurrently(tasks: ((worker: TestWorker) => Promise<void>)[], maxWorkers: number) {
  const workerCount = Math.min(maxWorkers, tasks.length);
  const threads: Promise<void>[] = [];
  const workStack = tasks.reverse();
  for (let i = 0; i < workerCount; i++)
    threads.push(spin(i));
  await Promise.all(threads);

  async function spin(workerId: number) {
    const worker = new TestWorker({workerId});
    let task;
    while (task = workStack.pop())
      await task(worker);
  }
}

function assertBrowserName(browserName: string): asserts browserName is 'webkit'|'chromium'|'firefox' {
  if (browserName !== 'firefox' && browserName !== 'chromium' && browserName !== 'webkit')
    throw new Error(`Unknown browser: ${browserName}`);
}
const defaultConfig = {
  browsers: ['chromium'],
}

function configForTestFile(rootDir: string, testFile: string) {
  let config = {};
  try {
    config = require(path.join(rootDir, 'playwright.config'));
    validate(config, {
      exampleConfig: defaultConfig
    });
  } catch {
  }
  return {
    ...defaultConfig,
    ...config,
  }
}

declare var jest : never;
function purgeRequireCache(files: string[]) {
  // Jest returns an annoying warning if we try to purge the cache
  // while being tested.
  if (typeof jest !== 'undefined')
    return;
  const blackList = new Set(files);
  for (const filePath of Object.keys(require.cache)) {
    /** @type {NodeModule|null|undefined} */
    let module: NodeModule | null | undefined = require.cache[filePath];
    while (module) {
      if (blackList.has(module.filename)) {
        delete require.cache[filePath];
        break;
      }
      module = module.parent;
    }

  }
}

function installGlobals() {
  for (const [name, value] of Object.entries(globals))
    (global as any)[name] = value;
}

const browserPromiseForName = new Map<string, Promise<playwright.Browser>>(); 

function ensureBrowserForName(browserName: string) {
  assertBrowserName(browserName);
  if (!browserPromiseForName.has(browserName))
    browserPromiseForName.set(browserName, playwright[browserName].launch());
  return browserPromiseForName.get(browserName)!;
}

const Runner = createJestRunner(async (options, jestRequireAndTransform) => {
  return await listTestsInternal(options, jestRequireAndTransform);
}, async(tests, options, onStart, onResult) => {
    const tasks = [];
    for (const test of tests) {
      const {browserName, describersTest, titles} =  test;
      
        tasks.push(async (worker: TestWorker) => {
          onStart(test);
          worker.state.browserName = browserName;
          const run = await worker.run(describersTest, options.timeout, NoHookTimeouts);
          onResult(test, {
            status: run.status,
            error: run.error,
          });
        });
    }
    await runTasksConcurrently(tasks, options.workers);
    purgeRequireCache(tests.map(test => test.testPath));
    await Promise.all(Array.from(browserPromiseForName.values()).map(async browserPromise => (await browserPromise).close()));
    browserPromiseForName.clear();
});

async function listTestsInternal(options: {path: string, rootDir: string}, requireCallback: () => void) {
  installGlobals();
  const suite = createSuite(async () => {
    beforeEach(async state => {
      if (state.page) {
        state.custom = true;
        return;
      }
      state.context = await (await ensureBrowserForName(state.browserName)).newContext();
      state.page = await state.context.newPage();
    });
    afterEach(async state => {
      if (state.custom)
        return;
      await state.context.close();
      delete state.page;
      delete state.context;
    });
    requireCallback();
  });
  // to match jest-runner behavior, all of our file suites are focused.
  suite.focused = true;
  const tests = await suite.tests(NoHookTimeouts);
  const config = configForTestFile(options.rootDir, options.path);
  return tests.map(describersTest => {
    return config.browsers.map(browserName => {
      const titles = config.browsers.length === 1 ? describersTest.ancestorTitles() : [browserName, ...describersTest.ancestorTitles()];
      return {
        describersTest,
        browserName,
        testPath: options.path,
        titles,
      }
    });
  }).flat();
}
async function listTests(options: {path: string, rootDir: string}) {
  const tests = await listTestsInternal(options, () => require(options.path));
  purgeRequireCache([options.path]);
  return tests;
}

export = Object.assign(Runner, {listTests});