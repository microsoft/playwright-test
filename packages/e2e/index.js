const {createEmptyTestResult} = require('@jest/test-result');

class PlaywrightRunnerE2E {
    /**
     * @param {import('@jest/types').Config.GlobalConfig} globalConfig 
     * @param {import('jest-runner').TestRunnerContext=} context 
     */
    constructor(globalConfig, context) {
        this._globalConfig = globalConfig;
        this._globalContext = context;
    }

    /**
     * @param {import('jest-runner').Test[]} testSuites 
     * @param {import('jest-runner').TestWatcher} watcher 
     * @param {import('jest-runner').OnTestStart} onStart 
     * @param {import('jest-runner').OnTestSuccess} onResult 
     * @param {import('jest-runner').OnTestFailure} onFailure 
     * @param {import('jest-runner').TestRunnerOptions} options 
     */
    async runTests(testSuites, watcher, onStart, onResult, onFailure, options) {
        for (const testSuite of testSuites) {
            onStart(testSuite);
            const testResults = [];
            for (let i = 0; i < 10; i++) {
                testResults.push(await fakeTest());
            }
            onResult(testSuite, makeSuiteResult(testResults));
        }
   }
}

/**
 * 
 * @param {import('@jest/types').TestResult.AssertionResult[]} assertionResults 
 * @return {import('@jest/test-result').TestResult}
 */
function makeSuiteResult(assertionResults) {
    const result = createEmptyTestResult();
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
    }
    return result;
}

async function fakeTest() {
    await new Promise(x => setTimeout(x, 100));
    /** @type {import('@jest/types').TestResult.AssertionResult} */
    const result = {
        ancestorTitles: [],
        failureMessages: [],
        fullName: 'hello',
        numPassingAsserts: 0,
        status: 'passed',
        title: 'hello',        
    };
    return result;
}

module.exports = PlaywrightRunnerE2E;