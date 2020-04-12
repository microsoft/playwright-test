import {createEmptyTestResult} from '@jest/test-result';
import * as playwright from 'playwright';
import type {Test, TestWatcher, OnTestStart, OnTestFailure, OnTestSuccess, TestRunnerOptions, TestRunnerContext} from 'jest-runner';
import type * as Jest from '@jest/types';
import { setupPage } from './setupPage';
import * as url from 'url';
import {formatExecError} from 'jest-message-util';

class PlaywrightRunnerUnit {
  private _globalConfig: Jest.Config.GlobalConfig;
  private _globalContext?:  TestRunnerContext;
  private _browserPromise: Promise<playwright.Browser>;
  constructor(globalConfig: Jest.Config.GlobalConfig, context?: TestRunnerContext) {
    this._globalConfig = globalConfig;
    this._globalContext = context;
    this._browserPromise = playwright.chromium.launch();
  }

  async runTests(testSuites: Test[], watcher: TestWatcher, onStart: OnTestStart, onResult: OnTestSuccess, onFailure: OnTestFailure, options: TestRunnerOptions) {
    const browser = await this._browserPromise;
    
    for (const testSuite of testSuites) {
      await onStart(testSuite);
      const page = await browser.newPage();
      await setupPage(page);
        const fileUrl = url.pathToFileURL(testSuite.path);
      await page.addScriptTag({
        type: 'module',
        url: `https://local_url${fileUrl.pathname}`,
      });
      const resultsString: string = await page.evaluate(() => (window as any)['__playwright__runAllTests']());
      const testResults : {result: import('describers').TestResult, name:string, fullName:string, ancestorTitles: string[]}[] = JSON.parse(resultsString, (key, value) => {
        if (value.__isError__) {
          const error = new Error(value.message);
          error.name = value.name;
          error.stack = value.stack.replace(/ \(https:\/\/local_url/g, ' (');
          return error;
        }
        return value;
      });
      const assertionResults = testResults.map(({ancestorTitles, fullName, result, name}) => {
        const assertionResult: Jest.TestResult.AssertionResult = {
          ancestorTitles: ancestorTitles,
          failureMessages: [],
          fullName: fullName,
          numPassingAsserts: 0,
          status: 'passed',
          title: name,
        };

        const {success, error} = result;
        if (!success) {
          assertionResult.status = 'failed';
          assertionResult.failureMessages.push(error instanceof Error ? formatExecError(error, {
            rootDir: this._globalConfig.rootDir,
            testMatch: [],
          }, {
            noStackTrace: false,
          }) : String(error));
        }
        return assertionResult;
      });
      await page.close();
      await onResult(testSuite, makeSuiteResult(assertionResults, testSuite.path));
    }
    if (!this._globalConfig.watch && !this._globalConfig.watchAll)
      await browser.close();
  }
}

function makeSuiteResult(assertionResults: Jest.TestResult.AssertionResult[], testPath: string): import('@jest/test-result').TestResult {
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

export = PlaywrightRunnerUnit;
