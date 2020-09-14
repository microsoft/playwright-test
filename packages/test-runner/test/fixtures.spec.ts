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
const { it } = fixtures;

it('should work', async ({runMiniTest}) => {
  const {results} = await runMiniTest({
    'a.test.js': `
      fixtures.defineTestFixture('asdf', async ({}, test) => await test(123));
      it('should use asdf', async ({asdf}) => {
        expect(asdf).toBe(123);
      });
    `,
  });
  expect(results[0].status).toBe('passed');
});


it.skip('should work with a non-async function', async ({runMiniTest}) => {
  const {results} = await runMiniTest({
    'a.test.js': `
      fixtures.defineTestFixture('asdf', async ({}, test) => await test(123));
      it('should use asdf', ({asdf}) => {
        expect(asdf).toBe(123);
      });
    `,
  });
  expect(results[0].status).toBe('passed');
});

it.skip('should fail with an unknown fixture', async ({runMiniTest}) => {
  const {results} = await runMiniTest({
    'a.test.js': `
      it('should use asdf', async ({asdf}) => {
        expect(asdf).toBe(123);
      });
    `,
  });
  expect(results[0].status).toBe('failed');
  expect(results[0].error.message).toBe('Error: Using undefined fixture asdf');
});

it('should run the fixture every time', async ({runMiniTest}) => {
  const {results} = await runMiniTest({
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

it('should only run worker fixtures once', async ({runMiniTest}) => {
  const {results} = await runMiniTest({
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

it('each file should get their own fixtures', async ({runMiniTest}) => {
  const {results} = await runMiniTest({
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

it('tests should be able to share worker fixtures', async ({runMiniTest}) => {
  const {results} = await runMiniTest({
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
