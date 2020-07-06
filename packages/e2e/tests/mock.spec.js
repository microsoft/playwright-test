const path = require('path');
const {fakeJestRun} = require('./fakeJestRun');
it('should report the corret number of tests', async function() {
  const result = await fakeJestRun(['oneTest.js', 'twoTests.js']);
  result.testResults.map(r => {
    r.failureMessage && console.log(r.failureMessage);
  });
  expect(result.numTotalTests).toBe(3);
  expect(result.numPassedTests).toBe(3);
  expect(result.numFailedTests).toBe(0);
  expect(result.numTotalTestSuites).toBe(2);
  expect(result.success).toBe(true);
});

it('should report the corret file name for the test', async function() {
  const result = await fakeJestRun(['oneTest.js']);
  expect(result.testResults[0].testFilePath).toEqual(path.join(__dirname, 'assets', 'oneTest.js'));
});

it('should report a failing test', async function() {
  const result = await fakeJestRun(['failingTest.js']);
  expect(result.numTotalTests).toBe(1);
  expect(result.numTotalTestSuites).toBe(1);
  expect(result.numPassedTests).toBe(0);
  expect(result.numFailedTests).toBe(1);
  expect(result.success).toBe(false);
  const testResult = result.testResults[0];
  expect(testResult.failureMessage).toContain('failingTest.js');
});

it('should report a timing out test', async function() {
  const result = await fakeJestRun(['timeout500Test.js'], { testTimeout: 1 });
  expect(result.numTotalTests).toBe(1);
  expect(result.numTotalTestSuites).toBe(1);
  expect(result.numPassedTests).toBe(0);
  expect(result.numFailedTests).toBe(1);
  expect(result.success).toBe(false);
  const testResult = result.testResults[0];
  expect(testResult.failureMessage).toEqual('timed out while running test');
});

it('should respect config.testTimeout', async function() {
  const result = await fakeJestRun(['timeout500Test.js'], { testTimeout: 1000 });
  expect(result.numTotalTests).toBe(1);
  expect(result.numTotalTestSuites).toBe(1);
  expect(result.numPassedTests).toBe(1);
  expect(result.numFailedTests).toBe(0);
  expect(result.success).toBe(true);
});

it('should work with typescript files', async function() {
  const result = await fakeJestRun(['typescriptTest.ts']);
  const [testResult] = result.testResults;
  expect(testResult.testFilePath).toEqual(path.join(__dirname, 'assets', 'typescriptTest.ts'));
  expect(result.success).toEqual(true);
});

it('should work with focused tests', async function() {
  const result = await fakeJestRun(['focusedTest.js', 'oneTest.js']);
  expect(result.success).toEqual(true);
  expect(result.numPassedTests).toBe(2);
  expect(result.numPendingTests).toBe(2);
  expect(result.numTotalTests).toBe(4);
});

describe('playwright.config', function() {
  it('should specify a config file', async function() {
    let gotMockConfig = false;
    global.getMockConfig = () => {
      gotMockConfig = true;
      return {
      };
    };
    const result = await fakeJestRun(['oneTest.js'], {rootDir: path.join(__dirname, 'assets')});
    expect(result.numPassedTests).toBe(1);
    expect(gotMockConfig).toBe(true);
  });
  it('should run two browsers', async function() {
    global.getMockConfig = () => {
      return {
        browsers: ['chromium', 'webkit']
      };
    };
    const result = await fakeJestRun(['onlyChrome.js'], {rootDir: path.join(__dirname, 'assets')});
    expect(result.numTotalTests).toBe(2);
    expect(result.numFailedTests).toBe(1);
    expect(result.numPassedTests).toBe(1);
  });
});
