import {Test, TestWorker} from 'describers';
import type {Config, TestResult} from '@jest/types';
import type {TestRunnerContext} from 'jest-runner';

import {createEmptyTestResult, TestResult as SuiteResult} from '@jest/test-result';
import {formatExecError} from 'jest-message-util';
import {ScriptTransformer} from '@jest/transform';
import * as globals from './globals';
import playwright from 'playwright';
import {createSuite, beforeEach, afterEach} from 'describers';

// TODO: figure out hook timeouts.
const NoHookTimeouts = 0;

class PlaywrightRunnerE2E {
  _globalConfig: Config.GlobalConfig;
  _globalContext?: TestRunnerContext;

  constructor(globalConfig: Config.GlobalConfig, context?: TestRunnerContext) {
    this._globalConfig = globalConfig;
    this._globalContext = context;
  }

  async runTests(testSuites: import('jest-runner').Test[], watcher: import('jest-runner').TestWatcher, onStart: import('jest-runner').OnTestStart, onResult: import('jest-runner').OnTestSuccess, onFailure: import('jest-runner').OnTestFailure, options: import('jest-runner').TestRunnerOptions) {
    const browser = await playwright.chromium.launch();
    installGlobals();
    const testToSuite: WeakMap<Test, import('jest-runner').Test> = new WeakMap();
    /** @type {Map<any, Set<Test>>} */
    const suiteToTests: Map<any, Set<Test>> = new Map();
    const startedSuites = new Set();
    const resultsForSuite = new Map();
    const rootSuite = createSuite(async () => {
      beforeEach(async state => {
        state.context = await browser.newContext();
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

    const worker = new TestWorker();
    for (const test of await rootSuite.tests(NoHookTimeouts)) {
      const suite: import('jest-runner').Test = testToSuite.get(test)!;
      if (!startedSuites.has(suite)) {
        startedSuites.add(suite);
        onStart(suite);
      }

      const run = await worker.run(test, this._globalConfig.testTimeout, NoHookTimeouts);
      const result: TestResult.AssertionResult = {
        ancestorTitles: test.ancestorTitles(),
        failureMessages: [],
        fullName: test.fullName(),
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
      if (suiteTests.size === suiteResults.length)
        onResult(suite, makeSuiteResult(suiteResults, this._globalConfig.rootDir, suite.path));
    }
    purgeRequireCache(testSuites.map(suite => suite.path));
    await worker.shutdown(NoHookTimeouts);
    await browser.close();
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