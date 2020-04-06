const {fakeJestRun} = require('./fakeJestRun');
it('should report the corret number of tests', async function() {
    const result = await fakeJestRun('oneTest.js', 'twoTests.js');
    expect(result.numTotalTests).toBe(3);
    expect(result.numPassedTests).toBe(3);
    expect(result.numFailedTests).toBe(0);
    expect(result.numTotalTestSuites).toBe(2);
    expect(result.success).toBe(true);
});

it('should report a failing test', async function() {
    const result = await fakeJestRun('failingTest.js');
    expect(result.numTotalTests).toBe(1);
    expect(result.numTotalTestSuites).toBe(1);
    expect(result.numPassedTests).toBe(0);
    expect(result.numFailedTests).toBe(1);
    expect(result.success).toBe(false);
    const testResult = result.testResults[0];
    expect(testResult.failureMessage).toContain('failingTest.js');
});
