const api = require('../out/index');

describe('it', () => {
  it('should run a test', async () => {
    let tested = false;
    const test = api.createTest('is a test', () => tested = true);
    const {success, error} = await test.runInIsolation();
    expect(success).toBe(true);
    expect(tested).toBe(true);
    expect(error).toBeUndefined();
  });

  it('should fail test', async () => {
    const test = api.createTest('is a test', () => {
      throw 'not an error';
    });
    const {success, error} = await test.runInIsolation();
    expect(success).toBe(false);
    expect(error).toBe('not an error');
  });

  it('should allow throwing null', async () => {
    const test = api.createTest('is a test', () => {
      throw null;
    });
    const {success, error} = await test.runInIsolation();
    expect(success).toBe(false);
    expect(error).toBe(null);
  });

  it('should allow throwing undefined', async () => {
    const test = api.createTest('is a test', () => {
      throw undefined;
    });
    const {success, error} = await test.runInIsolation();
    expect(success).toBe(false);
    expect(error).toBe(undefined);
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
    const results = await suite.runTestsSerially(1);
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
    const results = await suite.runTestsSerially(1);
    expect(log).toEqual(['before', 'after']);
    expect(results[0].success).toEqual(false);
    expect(results[0].error).toEqual('timed out while running hook');
  });
});

describe('hooks', () => {
  it('should run once or with every test', async () => {
    const log = [];
    const suite = api.createSuite(() => {
      api.beforeAll(() => log.push('beforeAll'));
      api.afterAll(() => log.push('afterAll'));
      api.beforeEach(() => log.push('beforeEach'));
      api.afterEach(() => log.push('afterEach'));
      api.it('first test', () => log.push('first'));
      api.it('second test', () => log.push('second'));
    });
    await suite.runTestsSerially();
    expect(log).toEqual(['beforeAll', 'beforeEach', 'first', 'afterEach', 'beforeEach', 'second', 'afterEach', 'afterAll']);
  });
  it('should setup and teardown state', async () => {
    const suite = api.createSuite(() => {
      api.beforeAll(state => state.bar = true);
      api.beforeEach(state => {
        expect(state.bar).toEqual(true);
        state.foo = true;
      });
      api.afterEach(state => {
        expect(state.bar).toEqual(true);
        expect(state.foo).toEqual(true);
        state.foo = false;
      });
      api.afterAll(state => {
        expect(state.bar).toEqual(true);
        expect(state.foo).toEqual(false);
      });
      api.it('test', state => {
        expect(state.foo).toEqual(true);
        expect(state.bar).toEqual(true);
      });
    });
    const results = await suite.runTestsSerially();
    expect(results.map(r => r.test.fullName())).toEqual(['test']);
    expect(results.map(r => r.success)).toEqual([true]);
  });
  it('should run in order', async () => {
    const log = [];
    const suite = api.createSuite(() => {
      api.beforeAll(() => log.push('ba1'));
      api.beforeAll(() => log.push('ba2'));
      api.beforeEach(() => log.push('b1'));
      api.beforeEach(() => log.push('b2'));
      api.beforeEach(() => log.push('b3'));
      api.afterEach(() => log.push('a1'));
      api.afterEach(() => log.push('a2'));
      api.afterEach(() => log.push('a3'));
      api.afterAll(() => log.push('aa1'));
      api.afterAll(() => log.push('aa2'));
      api.it('test', () => log.push('test'));
    });
    await suite.runTestsSerially();
    expect(log).toEqual(['ba1', 'ba2', 'b1', 'b2', 'b3', 'test', 'a1', 'a2', 'a3', 'aa1', 'aa2']);
  });
  it('should work with nested describes', async () => {
    let saved;
    const suite = api.createSuite(() => {
      api.beforeAll(state => state.bar = (state.bar || 0) + 1);
      api.afterAll(state => state.bar--);
      api.beforeEach(state => state.foo = true);
      api.afterEach(state => state.foo = 'done');
      api.describe(() => {
        api.describe(() => {
          api.beforeAll(state => state.bar++);
          api.afterAll(state => state.bar--);
          api.describe(() => {
            api.it('inner', state => {
              expect(state.bar).toEqual(2);
              expect(state.foo).toEqual(true);
              saved = state;
            });
          });
        });
      });
      api.it('outer', state => {
        expect(state.bar).toEqual(1);
      });
    });
    const results = await suite.runTestsSerially();
    expect(results.map(r => r.test.fullName())).toEqual(['inner', 'outer']);
    expect(results.map(r => r.success)).toEqual([true, true]);
    expect(saved.foo).toBe('done');
  });
});
