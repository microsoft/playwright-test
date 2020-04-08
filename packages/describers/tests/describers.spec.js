const api = require('../index');

it('should use describe to group tests', async () => {
  const suite = api.describe('', () => {
    api.it('first test', () => void 0);
    api.it('second test', () => void 0);
    api.it('third test', () => void 0);
  });
  const tests = await suite.tests();
  expect(tests.map(test => test.fullName())).toEqual([
    'first test',
    'second test',
    'third test'
  ]);
});

it('should support nested describe', async () => {
  let secondSuite;
  const suite = api.describe('outer', () => {
    api.it('first test', () => void 0);
    secondSuite = api.describe('inner', () => {
      api.it('second test', () => void 0);
    });
  });
  const tests = await suite.tests();
  expect(tests.map(test => test.fullName())).toEqual([
    'outer first test',
    'outer inner second test',
  ]);
  expect((await secondSuite.tests()).length).toEqual(1);
});

it('should support async describe', async () => {
  const suite = await api.describe('async describe', async () => {
    api.it('first test', () => void 0);
    await new Promise(x => setTimeout(x, 0));
    api.it('second test', () => void 0);
  });
  const tests = await suite.tests();
  expect(tests.map(test => test.fullName())).toEqual([
    'async describe first test',
    'async describe second test',
  ]);
});

it('should run a test', async () => {
  let tested = false;
  const test = api.it('is a test', () => tested = true);
  const {success, error} = await test.run();
  expect(success).toBe(true);
  expect(tested).toBe(true);
  expect(error).toBeUndefined();
});

it('should fail test', async () => {
  const test = api.it('is a test', () => {
    throw 'not an error';
  });
  const {success, error} = await test.run();
  expect(success).toBe(false);
  expect(error).toBe('not an error');
});

it('should tricky async scenarios', async () => {
  const suite = await api.describe('async describe', async () => {
    api.it('first test', () => void 0);
    await new Promise(x => setTimeout(x, 0));
    api.describe('suite a', async () => {
      api.it('second test', () => void 0);
      await new Promise(x => setTimeout(x, 10));
      api.it('third test', () => void 0);
    });
    api.it('fourth test', () => void 0);

    api.describe('suite b', async () => {
      api.describe('child 1', async () => {
        api.it('fifth test', () => void 0);
        await new Promise(x => setTimeout(x, 5));
        api.it('sixth test', () => void 0);
      });
      api.it('seventh test', () => void 0);
      await new Promise(x => setTimeout(x, 5));
      api.it('eighth test', () => void 0);

      api.describe('child 2', async () => {
        api.it('nineth test', () => void 0);
        await new Promise(x => setTimeout(x, 5));
        api.it('tenth test', () => void 0);
      });
    });
  });
  const tests = await suite.tests();
  expect(tests.map(test => test.fullName())).toEqual([
    'async describe first test',
    'async describe suite a second test',
    'async describe suite a third test',
    'async describe fourth test',
    'async describe suite b child 1 fifth test',
    'async describe suite b child 1 sixth test',
    'async describe suite b seventh test',
    'async describe suite b eighth test',
    'async describe suite b child 2 nineth test',
    'async describe suite b child 2 tenth test',
  ]);
});
