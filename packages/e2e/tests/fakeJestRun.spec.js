const {fakeJestRun} = require('./fakeJestRun');

it('should work', async function() {
  const result = await fakeJestRun();
  expect(result.numTotalTests).toBe(0);
  expect(result.wasInterrupted).toBe(false);
});

