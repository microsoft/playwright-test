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
  _globalConfig: Config.GlobalConfig;
  _globalContext?: TestRunnerContext;

  constructor(globalConfig: Config.GlobalConfig, context?: TestRunnerContext) {
    this._globalConfig = globalConfig;
    this._globalContext = context;
  }

  async runTests(testSuites: JestSuite[], watcher: TestWatcher, onStart: OnTestStart, onResult: OnTestSuccess, onFailure: OnTestFailure, options: TestRunnerOptions) {
    const browserPromiseForName = new Map<string, Promise<playwright.Browser>>(); 
    installGlobals();
    const testToSuite: WeakMap<Test, JestSuite> = new WeakMap();
    /** @type {Map<any, Set<Test>>} */
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
        for (const test of await suite.tests()) {
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

    for (const test of await rootSuite.tests(NoHookTimeouts)) {
      const suite: JestSuite = testToSuite.get(test)!;
      const config = configForTestSuite(suite);
      for (const browserName of config.browsers) {
        assertBrowserName(browserName);
        if (!startedSuites.has(suite)) {
          startedSuites.add(suite);
          onStart(suite);
        }

        const run = await browserWorkers[browserName].run(test, this._globalConfig.testTimeout, NoHookTimeouts);
        const result: TestResult.AssertionResult = {
          ancestorTitles: config.browsers.length > 1 ? [browserName, ...test.ancestorTitles()] : test.ancestorTitles(),
          failureMessages: [],
          fullName: (config.browsers.length > 1 ? browserName + ' ' : '') + test.fullName(),
          numPassingAsserts: 0,
          status: 'passed',
          title: test.name,
        };
        if (!run.success) {
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
      }
    }
    purgeRequireCache(testSuites.map(suite => suite.path));
    await Promise.all([
      browserWorkers.chromium.shutdown(NoHookTimeouts),
      browserWorkers.firefox.shutdown(NoHookTimeouts),
      browserWorkers.webkit.shutdown(NoHookTimeouts),
    ]);
    await Promise.all(Array.from(browserPromiseForName.values()).map(async browserPromise => (await browserPromise).close()));

    function ensureBrowserForName(browserName: string) {
      assertBrowserName(browserName);
      if (!browserPromiseForName.has(browserName))
        browserPromiseForName.set(browserName, playwright[browserName].launch());
      return browserPromiseForName.get(browserName)!;
    }
  }
}

function assertBrowserName(browserName: string): asserts browserName is 'webkit'|'chromium'|'firefox' {
  if (browserName !== 'firefox' && browserName !== 'chromium' && browserName !== 'webkit')
    throw new Error(`Unknown browser: ${browserName}`);
}

function configForTestSuite(suite: JestSuite) {
  let config = {};
  try {
    config = require(path.join(suite.context.config.rootDir, 'playwright.config'));
  } catch {
  }
  return {
    browsers: ['chromium'],
    ...config
  }
}

function purgeRequireCache(files: string[]) {
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
      result.numPassingTests++;
    else if (assertionResult.status === 'todo')
      result.numTodoTests++;
    result.testResults.push(assertionResult);
    failureMessages.push(...assertionResult.failureMessages);
  }
  result.failureMessage = assertionResults.flatMap(result => result.failureMessages).join('\n');
  return result;
}

module.exports = PlaywrightRunnerE2E;