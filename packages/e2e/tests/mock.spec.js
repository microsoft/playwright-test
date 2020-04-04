const {fakeJestRun} = require('./fakeJestRun');

it('should report the corret number of suites', async function() {
    const result = await fakeJestRun('a', 'b', 'c');
    expect(result.numTotalTests).toBe(3);
});

