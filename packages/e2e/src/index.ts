import {Test, TestWorker} from 'describers';
import type {Config, TestResult} from '@jest/types';
import type {TestRunnerContext, TestWatcher, OnTestStart, OnTestSuccess, Test as JestSuite, TestRunnerOptions, OnTestFailure} from 'jest-runner';
import {createEmptyTestResult, TestResult as SuiteResult} from '@jest/test-result';
import {formatExecError} from 'jest-message-util';
import {ScriptTransformer} from '@jest/transform';
import * as globals from './globals';
import playwright from 'playwright';
import {createSuite, beforeEach, afterEach} from 'describers';
import path from 'path';

// TODO: figure out hook timeouts.
const NoHookTimeouts = 0;

class PlaywrightRunnerE2E {
  private _globalConfig: Config.GlobalConfig;
  private _globalContext?: TestRunnerContext;

  constructor(globalConfig: Config.GlobalConfig, context?: TestRunnerContext) {
    this._globalConfig = globalConfig;
    this._globalContext = context;
  }

  async runTests(testSuites: JestSuite[], watcher: TestWatcher, onStart: OnTestStart, onResult: OnTestSuccess, onFailure: OnTestFailure, options: TestRunnerOptions) {
    const browserPromiseForName = new Map<string, Promise<playwright.Browser>>();
    installGlobals();
    const testToSuite: WeakMap<Test, JestSuite> = new WeakMap();
    const suiteToTests: Map<any, Set<Test>> = new Map();
    const startedSuites = new Set();
    const resultsForSuite = new Map();
    const rootSuite = createSuite(async () => {
      beforeEach(async state => {
        state.context = await (await ensureBrowserForName(state.browserName)).newContext();
        state.page = await state.context.newPage();
      });
      afterEach(async state => {
        await state.context.close();
        delete state.page;
        delete state.context;
      });
      for (const testSuite of testSuites) {
        const transformer = new ScriptTransformer(testSuite.context.config);
        resultsForSuite.set(testSuite, []);
        suiteToTests.set(testSuite, new Set());
        const suite = createSuite(async () => {
          transformer.requireAndTranspileModule(testSuite.path);
        });

        // to match jest-runner behavior, all of our file suites are focused.
        suite.focused = true;

        for (const test of await suite.tests(NoHookTimeouts)) {
          if (testToSuite.has(test))
            continue;
          testToSuite.set(test, testSuite);
          suiteToTests.get(testSuite)!.add(test);
        }
      }
    });

    const browserWorkers = {
      chromium: new TestWorker({browserName: 'chromium'}),
      firefox: new TestWorker({browserName: 'firefox'}),
      webkit: new TestWorker({browserName: 'webkit'}),
      __proto__: null,
    };

    const tasks = [];
    for (const test of await rootSuite.tests(NoHookTimeouts)) {
      const suite: JestSuite = testToSuite.get(test)!;
      const config = configForTestSuite(suite);
      for (const browserName of config.browsers) {
        assertBrowserName(browserName);
        tasks.push(async (worker: TestWorker) => {
          if (!startedSuites.has(suite)) {
            startedSuites.add(suite);
            onStart(suite);
          }
          worker.state.browserName = browserName;
          const run = await worker.run(test, this._globalConfig.testTimeout, NoHookTimeouts);
          const result: TestResult.AssertionResult = {
            ancestorTitles: config.browsers.length > 1 ? [browserName, ...test.ancestorTitles()] : test.ancestorTitles(),
            failureMessages: [],
            fullName: (config.browsers.length > 1 ? browserName + ' ' : '') + test.fullName(),
            numPassingAsserts: 0,
            status: run.status === 'pass' ? 'passed' : 'pending',
            title: test.name,
          };
          if (run.status === 'fail') {
            result.status = 'failed';
            result.failureMessages.push(run.error instanceof Error ? formatExecError(run.error, {
              rootDir: this._globalConfig.rootDir,
              testMatch: [],
            }, {
              noStackTrace: false,
            }) : String(run.error));
          }

          const suiteResults = resultsForSuite.get(suite);
          suiteResults.push(result);
          const suiteTests: Set<Test> = suiteToTests.get(suite)!;
          if (suiteTests.size * config.browsers.length === suiteResults.length)
            onResult(suite, makeSuiteResult(suiteResults, this._globalConfig.rootDir, suite.path));
        });
      }
    }
    await runTasksConcurrently(tasks, options.serial ? 1 : this._globalConfig.maxWorkers);
    purgeRequireCache(testSuites.map(suite => suite.path));
    await Promise.all([
      browserWorkers.chromium.shutdown(NoHookTimeouts),
      browserWorkers.firefox.shutdown(NoHookTimeouts),
      browserWorkers.webkit.shutdown(NoHookTimeouts),
    ]);
    await Promise.all(Array.from(browserPromiseForName.values()).map(async browserPromise => (await browserPromise).close()));

      function ensureBrowserForName(browserName: string): Promise<playwright.Browser>  {
      assertBrowserName(browserName);
      if (!browserPromiseForName.has(browserName))
        browserPromiseForName.set(browserName, playwright[browserName].launch());
      return browserPromiseForName.get(browserName)!;
    }
  }
}

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

type Browser = "chromium" | "webkit" | "firefox"

function assertBrowserName(browserName: string): asserts browserName is Browser {
  if (browserName !== 'firefox' && browserName !== 'chromium' && browserName !== 'webkit')
    throw new Error(`Unknown browser: ${browserName}`);
}

interface UserConfig {
  browsers: Browser[]
  launchOptions: playwright.LaunchOptions,
  contextOptions: playwright.BrowserContextOptions
}

const DEFAULT_CONFIG: UserConfig = {
  browsers: ['chromium'],
  launchOptions: {},
  contextOptions: {}
};

function configForTestSuite(suite: JestSuite): UserConfig {
  try {
    const localConfig = require(path.join(suite.context.config.rootDir, 'playwright.config'));
    return {
      ...DEFAULT_CONFIG,
      localConfig
    } as UserConfig
  } catch (err) {
  }
  return DEFAULT_CONFIG
}

declare var jest: never;
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

function makeSuiteResult(assertionResults: TestResult.AssertionResult[], rootDir: string, testPath: string): SuiteResult {
  const result = createEmptyTestResult();
  result.testFilePath = testPath;
  const failureMessages = [];
  for (const assertionResult of assertionResults) {
    if (assertionResult.status === 'passed')
      result.numPassingTests++;
    else if (assertionResult.status === 'failed')
      result.numFailingTests++;
    else if (assertionResult.status === 'pending')
      result.numPendingTests++;
    else if (assertionResult.status === 'todo')
      result.numTodoTests++;
    result.testResults.push(assertionResult);
    failureMessages.push(...assertionResult.failureMessages);
  }
  result.failureMessage = assertionResults.flatMap(result => result.failureMessages).join('\n');
  return result;
}

export = PlaywrightRunnerE2E;
