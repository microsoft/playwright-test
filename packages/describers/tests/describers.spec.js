const api = require('../out/index');

describe('it', () => {
  it('should run a test', async () => {
    let tested = false;
    const test = api.createTest('is a test', () => tested = true);
    const {success, error} = await test.run();
    expect(success).toBe(true);
    expect(tested).toBe(true);
    expect(error).toBeUndefined();
  });

  it('should fail test', async () => {
    const test = api.createTest('is a test', () => {
      throw 'not an error';
    });
    const {success, error} = await test.run();
    expect(success).toBe(false);
    expect(error).toBe('not an error');
  });
});

describe('describe', () => {
  it('should use describe to group tests', async () => {
    const suite = api.createSuite('', () => {
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
    const suite = api.createSuite('outer', () => {
      api.it('first test', () => void 0);
      secondSuite = api.createSuite('inner', () => {
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
    const suite = await api.createSuite('async describe', async () => {
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

  it('should tricky async scenarios', async () => {
    const suite = await api.createSuite('async describe', async () => {
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
});

describe('timeout', () => {
  it('should handle test timeout', async () => {
    const suite = api.createSuite(() => {
      api.it('test', () => new Promise(() => {}));
    });
    const results = await suite.runTestsSerially({}, 1);
    expect(results[0].success).toEqual(false);
    expect(results[0].error).toEqual('timed out while running test');
  });
  it('should handle hook timeout and still run hooks but not tests', async () => {
    const log = [];
    const suite = api.createSuite(() => {
      api.beforeEach(() => {
        log.push('before');
        return new Promise(() => {});
      });
      api.afterEach(() => log.push('after'));
      api.it('test', () => log.push('test'));
    });
    const results = await suite.runTestsSerially({}, 1);
    expect(log).toEqual(['before', 'after']);
    expect(results[0].success).toEqual(false);
    expect(results[0].error).toEqual('timed out while running hook');
  });
});

describe('beforeEach/afterEach', () => {
  it('should run with every test', async () => {
    const log = [];
    const suite = api.createSuite(() => {
      api.beforeEach(() => {
        log.push('before');
      });
      api.afterEach(() => {
        log.push('after');
      });
      api.it('first test', () => {
        log.push('first');
      });
      api.it('second test', () => {
        log.push('second');
      });
    });
    await suite.runTestsSerially();
    expect(log).toEqual(['before', 'first', 'after', 'before', 'second', 'after']);
  });
  it('should setup and teardown state', async () => {
    const suite = api.createSuite(() => {
      api.beforeEach(state => state.foo = true);
      api.afterEach(state => expect(state.foo).toEqual(true));
      api.it('test', ({foo}) => expect(foo).toEqual(true));
    });
    const results = await suite.runTestsSerially();
    expect(results).toEqual([
      {name: 'test', success: true}
    ]);
  });
  it('should run in order', async () => {
    const log = [];
    const suite = api.createSuite(() => {
      api.beforeEach(() => log.push('b1'));
      api.beforeEach(() => log.push('b2'));
      api.beforeEach(() => log.push('b3'));
      api.afterEach(() => log.push('a1'));
      api.afterEach(() => log.push('a2'));
      api.afterEach(() => log.push('a3'));
      api.it('test', () => log.push('test'));
    });
    await suite.runTestsSerially();
    expect(log).toEqual(['b1', 'b2', 'b3', 'test', 'a1', 'a2', 'a3']);
  });
  it('should work with nested describes', async () => {
    let saved;
    const suite = api.createSuite(() => {
      api.beforeEach(state => state.foo = true);
      api.afterEach(state => state.foo = 'done');
      api.describe(() => {
        api.describe(() => {
          api.describe(() => {
            api.it('test', state => {
              expect(state.foo).toEqual(true);
              saved = state;
            });
          });
        });
      });
    });
    const results = await suite.runTestsSerially();
    expect(results).toEqual([
      {name: 'test', success: true}
    ]);
    expect(saved.foo).toBe('done');
  });
});
