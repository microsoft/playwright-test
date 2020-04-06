const path = require('path');
const {createEmptyTestResult} = require('@jest/test-result');
const {formatExecError} = require('jest-message-util')
const globals = require('./globals');
const {Test, testRunner} = require('./test-runner');
const {tempRequire, clearTempRequires} = require('./tempRequire');

class PlaywrightRunnerE2E {
    /**
     * @param {import('@jest/types').Config.GlobalConfig} globalConfig 
     * @param {import('jest-runner').TestRunnerContext=} context 
     */
    constructor(globalConfig, context) {
        this._globalConfig = globalConfig;
        this._globalContext = context;
        installGlobals();
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
        clearLastRun();
        /** @type {WeakMap<Test, import('jest-runner').Test>} */
        const testToSuite = new WeakMap();
        /** @type {Map<any, Set<Test>>} */
        const suiteToTests = new Map();
        const startedSuites = new Set();
        const resultsForSuite = new Map();
        for (const testSuite of testSuites) {
            resultsForSuite.set(testSuite, []);
            suiteToTests.set(testSuite, new Set());
            tempRequire(testSuite.path);
            for (const test of testRunner.tests()) {
                if (testToSuite.has(test))
                    continue;
                testToSuite.set(test, testSuite);
                /** @type {Set<Test>} */ (suiteToTests.get(testSuite)).add(test);
            }
        }
        for (const test of testRunner.tests()) {            
            const suite = /** @type {import('jest-runner').Test} */(testToSuite.get(test));
            if (!startedSuites.has(suite)) {
                startedSuites.add(suite);
                onStart(suite);
            }
            const suiteResults = resultsForSuite.get(suite);
            const result = await this._runTest(test);
            suiteResults.push(result);
            const suiteTests = /** @type {Set<Test>} */ (suiteToTests.get(suite));
            if (suiteTests.size === suiteResults.length)
                onResult(suite, makeSuiteResult(suiteResults, this._globalConfig.rootDir, suite.path));
        }
    }

    /**
     * @param {Test} test 
     */
    async _runTest(test) {
        /** @type {import('@jest/types').TestResult.AssertionResult} */
        const result = {
            ancestorTitles: test.ancestorTitles(),
            failureMessages: [],
            fullName: test.fullName(),
            numPassingAsserts: 0,
            status: 'passed',
            title: test.name(),
        };

        try {
            await test.body()();
        } catch(e) {
            result.status = 'failed';
            result.failureMessages.push( e instanceof Error ? formatExecError(e, {
                rootDir: this._globalConfig.rootDir,
                testMatch: [],
            }, {
                noStackTrace: false,
            }) : String(e));
        }
        return result;    
    }
}

function clearLastRun() {
    testRunner.clear();
    clearTempRequires();
}

function installGlobals() {
    for (const [name, value] of Object.entries(globals))
        /** @type {any} */ (global)[name] = value;
}

/**
 * @param {import('@jest/types').TestResult.AssertionResult[]} assertionResults 
 * @param {string} rootDir
 * @param {string=} testPath
 * @return {import('@jest/test-result').TestResult}
 */
function makeSuiteResult(assertionResults, rootDir, testPath) {
    const result = createEmptyTestResult();
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