/**
 * Copyright Microsoft Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { expect } from '@playwright/test-runner';
import { fixtures } from './fixtures';
const { it, describe } = fixtures;

it('should work', async ({ runInlineTest }) => {
  const { results } = await runInlineTest({
    'a.test.js': `
      fixtures.defineTestFixture('asdf', async ({}, test) => await test(123));
      it('should use asdf', async ({asdf}) => {
        expect(asdf).toBe(123);
      });
    `,
  });
  expect(results[0].status).toBe('passed');
});

it('should work with a sync function', async ({ runInlineTest }) => {
  const { results } = await runInlineTest({
    'a.test.js': `
      fixtures.defineTestFixture('asdf', async ({}, test) => await test(123));
      it('should use asdf', ({asdf}) => {
        expect(asdf).toBe(123);
      });
    `,
  });
  expect(results[0].status).toBe('passed');
});

it('should work with a non-arrow function', async ({ runInlineTest }) => {
  const { results } = await runInlineTest({
    'a.test.js': `
      fixtures.defineTestFixture('asdf', async ({}, test) => await test(123));
      it('should use asdf', function ({asdf}) {
        expect(asdf).toBe(123);
      });
    `,
  });
  expect(results[0].status).toBe('passed');
});

it('should work with a named function', async ({ runInlineTest }) => {
  const { results } = await runInlineTest({
    'a.test.js': `
      fixtures.defineTestFixture('asdf', async ({}, test) => await test(123));
      it('should use asdf', async function hello({asdf}) {
        expect(asdf).toBe(123);
      });
    `,
  });
  expect(results[0].status).toBe('passed');
});

it('should work with renamed parameters', async ({ runInlineTest }) => {
  const { results } = await runInlineTest({
    'a.test.js': `
      fixtures.defineTestFixture('asdf', async ({}, test) => await test(123));
      it('should use asdf', function ({asdf: renamed}) {
        expect(renamed).toBe(123);
      });
    `,
  });
  expect(results[0].status).toBe('passed');
});

it('should fail if parameters are not destructured', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.js': `
      fixtures.defineTestFixture('asdf', async ({}, test) => await test(123));
      it('should pass', function () {
        expect(1).toBe(1);
      });
      it('should use asdf', function (abc) {
        expect(abc.asdf).toBe(123);
      });
    `,
  });
  expect(result.passed).toBe(1);
  expect(result.failed).toBe(1);
  expect(result.output).toContain('First argument must use the object destructuring pattern.');
  expect(result.output).toContain('a.test.js');
});

it('should fail with an unknown fixture', async ({runInlineTest}) => {
  const { results } = await runInlineTest({
    'a.test.js': `
      it('should use asdf', async ({asdf}) => {
        expect(asdf).toBe(123);
      });
    `,
  });
  expect(results[0].error.message).toBe('Could not find fixture "asdf"');
});

it('should run the fixture every time', async ({ runInlineTest }) => {
  const { results } = await runInlineTest({
    'a.test.js': `
      let counter = 0;
      fixtures.defineTestFixture('asdf', async ({}, test) => await test(counter++));
      it('should use asdf', async ({asdf}) => {
        expect(asdf).toBe(0);
      });
      it('should use asdf', async ({asdf}) => {
        expect(asdf).toBe(1);
      });
      it('should use asdf', async ({asdf}) => {
        expect(asdf).toBe(2);
      });
    `,
  });
  expect(results.map(r => r.status)).toEqual(['passed', 'passed', 'passed']);
});

it('should only run worker fixtures once', async ({ runInlineTest }) => {
  const { results } = await runInlineTest({
    'a.test.js': `
      let counter = 0;
      fixtures.defineWorkerFixture('asdf', async ({}, test) => await test(counter++));
      it('should use asdf', async ({asdf}) => {
        expect(asdf).toBe(0);
      });
      it('should use asdf', async ({asdf}) => {
        expect(asdf).toBe(0);
      });
      it('should use asdf', async ({asdf}) => {
        expect(asdf).toBe(0);
      });
    `,
  });
  expect(results.map(r => r.status)).toEqual(['passed', 'passed', 'passed']);
});

it('each file should get their own fixtures', async ({ runInlineTest }) => {
  const { results } = await runInlineTest({
    'a.test.js': `
      fixtures.defineWorkerFixture('worker', async ({}, test) => await test('worker-a'));
      fixtures.defineTestFixture('test', async ({}, test) => await test('test-a'));
      it('should use worker', async ({worker, test}) => {
        expect(worker).toBe('worker-a');
        expect(test).toBe('test-a');
      });
    `,
    'b.test.js': `
      fixtures.defineWorkerFixture('worker', async ({}, test) => await test('worker-b'));
      fixtures.defineTestFixture('test', async ({}, test) => await test('test-b'));
      it('should use worker', async ({worker, test}) => {
        expect(worker).toBe('worker-b');
        expect(test).toBe('test-b');
      });
    `,
    'c.test.js': `
      fixtures.defineWorkerFixture('worker', async ({}, test) => await test('worker-c'));
      fixtures.defineTestFixture('test', async ({}, test) => await test('test-c'));
      it('should use worker', async ({worker, test}) => {
        expect(worker).toBe('worker-c');
        expect(test).toBe('test-c');
      });
    `,
  });
  expect(results.map(r => r.status)).toEqual(['passed', 'passed', 'passed']);
});

it('tests should be able to share worker fixtures', async ({ runInlineTest }) => {
  const { results } = await runInlineTest({
    'worker.js': `
      global.counter = 0;
      fixtures.defineWorkerFixture('worker', async ({}, test) => await test(global.counter++));
    `,
    'a.test.js': `
      require('./worker.js');
      it('should use worker', async ({worker}) => {
        expect(worker).toBe(0);
      });
    `,
    'b.test.js': `
      require('./worker.js');
      it('should use worker', async ({worker}) => {
        expect(worker).toBe(0);
      });
    `,
    'c.test.js': `
      require('./worker.js');
      it('should use worker', async ({worker}) => {
        expect(worker).toBe(0);
      });
    `,
  });
  expect(results.map(r => r.status)).toEqual(['passed', 'passed', 'passed']);
});
describe('nested fixtures', () => {
  it('should work', async ({runInlineTest}) => {
    const {results} = await runInlineTest({
      'a.test.js': js`
      defineTestFixture('foobar', async ({ }, runTest) => {
        await runTest(1);
      });
      
      defineTestFixture('foobar', async ({ foobar }, runTest) => {
        expect(foobar).toBe(1);
        await runTest(foobar + 1);
      });
      
      defineTestFixture('foobar', async ({ foobar }, runTest) => {
        expect(foobar).toBe(2);
        await runTest(foobar + 1);
      });
      
      it('assert foobar fixture value first time', async ({ foobar }) => {
        expect(foobar).toBe(3);
      });
      
      it('assert foobar fixture value second time', async ({ foobar }) => {
        expect(foobar).toBe(3);
      });
    `
    });
    expect(results.map(r => r.status)).toEqual(['passed', 'passed']);
  });

  it('should work across files', async ({runInlineTest}) => {
    const {results} = await runInlineTest({
      'foobar.js': js`
        defineTestFixture('foobar', async ({ }, runTest) => {
          await runTest(1);
        });
      `,
      '1.test.js': js`
        require('./foobar');
        it('assert foobar value', async ({ foobar }) => {
          expect(foobar).toBe(1);
        });
      `,
      '2.test.js': js`
        require('./foobar');
        defineTestFixture('foobar', async ({ foobar }, runTest) => {
          await runTest(foobar + 1);
        });
        it('assert foobar value', async ({ foobar }) => {
          expect(foobar).toBe(2);
        });
      `,
      '2again.test.js': js`
        require('./foobar');
        defineTestFixture('foobar', async ({ foobar }, runTest) => {
          await runTest(foobar + 1);
        });
        it('assert foobar value', async ({ foobar }) => {
          expect(foobar).toBe(2);
        });
      `
    });
    expect(results.map(r => r.status)).toEqual(['passed', 'passed', 'passed']);
  });
  it('should fail with undefined super error', async ({runInlineTest}) => {
    const {results} = await runInlineTest({
      'a.test.js': js`
        defineTestFixture('foobar', async ({ foobar }, runTest) => {
          await runTest(foobar + 1);
        });
        it('dummy', ({foobar}) => {});
      `
    });
    expect(results[0].status).toBe('failed');
    // the current error message is bad
    // expect(results[0].error.message).toBe('Cannot use fixture foobar before it is defined.');
  });
  it('should fail with undefined super error', async ({runInlineTest}) => {
    const {results} = await runInlineTest({
      'a.test.js': js`
        defineTestFixture('foobar', async ({ foobar }, runTest) => {
          await runTest(foobar + 1);
        });
        it('dummy', ({foobar}) => {});
      `
    });
    expect(results[0].status).toBe('failed');
    // the current error message is bad
    // expect(results[0].error.message).toBe('Cannot use fixture foobar before it is defined.');
  });
  it('should isolate fixture order by file', async ({runInlineTest}) => {
    const {results} = await runInlineTest({
      'blank.js': js`
        defineTestFixture('foobar', async ({ }, runTest) => {
          await runTest('');
        });
      `,
      'a.js': js`
        require('./blank');
        defineTestFixture('foobar', async ({ foobar }, runTest) => {
          await runTest(foobar + 'a');
        });
      `,
      'b.js': js`
        require('./blank');
        defineTestFixture('foobar', async ({ foobar }, runTest) => {
          await runTest(foobar + 'b');
        });
      `,
      'ab.test.js': js`
        require('./a');
        require('./b');
        it('should be ab', ({foobar}) => {
          expect(foobar).toBe('ab');
        });
      `,
      'ba.test.js': js`
        require('./b');
        require('./a');
        it('should be ba', ({foobar}) => {
          expect(foobar).toBe('ba');
        });
      `
    });
    expect(results.map(r => r.status)).toEqual(['passed', 'passed']);
  });
});

// Just for nice syntax highlighting
function js(a) {
  return a[0];
}