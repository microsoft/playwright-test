import {createEmptyTestResult, TestResult as SuiteResult, Status} from '@jest/test-result';
import type {Config, TestResult as JestTestResult} from '@jest/types';
import type {TestRunnerContext, TestWatcher, OnTestStart, OnTestSuccess, Test as JestSuite, TestRunnerOptions, OnTestFailure} from 'jest-runner';
import {ScriptTransformer} from '@jest/transform';
import {formatExecError} from 'jest-message-util';
import { cpus } from 'os';
type TestResult = {
  status: 'pass'|'fail'|'skip'|'todo',
  error?: any,
}
type TestRunOptions = {
  workers: number,
  timeout?: number,
}
export function createJestRunner<TestDefinition extends {titles: string[]}>(
  testsAtPath: (options: {path: string, rootDir: string}, jestRequireAndTransform: () => void) => Promise<TestDefinition[]>,
  runTests: (tests: TestDefinition[], options: TestRunOptions, onStart: (test: TestDefinition) => Promise<void>, onResult: (test: TestDefinition, result: TestResult) => Promise<void>) => Promise<void>) {
  return class {
    runTests: (testSuites: JestSuite[], watcher: TestWatcher, onStart: OnTestStart, onResult: OnTestSuccess, onFailure: OnTestFailure, options: TestRunnerOptions) => Promise<void>;

    constructor(globalConfig: Config.GlobalConfig, context?: TestRunnerContext) {
      globalConfig = globalConfig;
      this.runTests = async (testSuites, watcher, onStart, onResult, onFailure, options) => {
        const testToSuite = new WeakMap<TestDefinition, JestSuite>();
        const testResults = new WeakMap<TestDefinition, TestResult>();
        const suiteToTests = new Map<JestSuite, TestDefinition[]>();
        const startedSuites = new Set<JestSuite>();
        const resultsForSuite = new Map();
        const filterRegex = globalConfig.testNamePattern ? new RegExp(globalConfig.testNamePattern, 'i') : null;

        for (const testSuite of testSuites) {
          try {
            const tests = (await testsAtPath({
              path: testSuite.path,
              rootDir: testSuite.context.config.rootDir,
            }, () => {
              const transformer = new ScriptTransformer(testSuite.context.config);
                transformer.requireAndTranspileModule(testSuite.path);
            })).filter(test => filterRegex ? filterRegex.test(test.titles.join(' ')) : true);
            resultsForSuite.set(testSuite, []);
            suiteToTests.set(testSuite, tests);
            for (const test of tests)
              testToSuite.set(test, testSuite);  
          } catch(e) {
            await onFailure(testSuite, e);      
          }
        }
        // When just tells us to run in serial, it is actually lying
        // figure out our own worker value
        const workers = options.serial ? cpus().length - 1 : globalConfig.maxWorkers;
        await runTests(
          [...suiteToTests.values()].flat(),
          {
            timeout: globalConfig.testTimeout,
            workers
          },
          async test => {
            const suite = testToSuite.get(test)!;
            if (startedSuites.has(suite))
              return;
            startedSuites.add(suite);
            onStart(suite);
          },
          async (test, result) => {
            const suite = testToSuite.get(test)!;
            testResults.set(test, result);
            const tests = suiteToTests.get(suite)!;
            if (tests.some(test => !testResults.has(test)))
              return;
            const assertionResults = tests.map(test => {
              const result = testResults.get(test)!;
              const status: Status = ({
                'pass': 'passed',
                'fail': 'failed',
                'skip': 'pending',
                'todo': 'todo',
              } as const)[result.status];
              const jestResult: JestTestResult.AssertionResult = {
                ancestorTitles: test.titles.slice(0, test.titles.length - 1),
                failureMessages: [],
                fullName: test.titles.join(' '),
                numPassingAsserts: 0,
                status,
                title: test.titles[test.titles.length - 1],
              };
              if (result.status === 'fail') {
                jestResult.status = 'failed';
                jestResult.failureMessages.push(result.error instanceof Error ? formatExecError(result.error, {
                  rootDir: globalConfig.rootDir,
                  testMatch: [],
                }, {
                  noStackTrace: false,
                }) : String(result.error));
              }
              return jestResult;
            });
            const suiteResult = makeSuiteResult(assertionResults, suite.path);
            onResult(suite, suiteResult);
          }
        );
      }
    }
  }
}

function makeSuiteResult(assertionResults: JestTestResult.AssertionResult[], testPath: string): SuiteResult {
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
  result.skipped = !result.numPassingTests && !result.numFailingTests;
  result.failureMessage = assertionResults.flatMap(result => result.failureMessages).join('\n');
  return result;
}
