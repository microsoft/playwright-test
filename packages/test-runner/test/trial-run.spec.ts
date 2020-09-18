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

it('should work with parameters', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'fixture.spec.js': `
      fixtures.defineParameter('worker', '', '');
      fixtures.generateParametrizedTests('worker', ['A', 'B', 'C']);
    `,
    'a.test.js': `
      require('./fixture.spec.js');
      it('should use worker A', (test, parameters) => {
        test.fail(parameters.worker !== 'A');
      }, async ({worker}) => {
        expect(true).toBe(false);
      });
    `,
    'b.test.js': `
      require('./fixture.spec.js');
      it('should use worker B', (test, parameters) => {
        test.fail(parameters.worker !== 'B');
      }, async ({worker}) => {
        expect(true).toBe(false);
      });
    `,
    'c.test.js': `
      require('./fixture.spec.js');
      it('should use worker C', (test, parameters) => {
        test.fail(parameters.worker !== 'C');
      }, async ({worker}) => {
        expect(true).toBe(false);
      });
    `,
  }, { 'trial-run': true });
  expect(result.exitCode).toBe(0);
  expect(result.passed).toBe(9);
  expect(result.failed).toBe(0);
  const suites = result.report.suites;
  expect(suites.filter(s => s.file.includes('a.test.js')).length).toBe(3);
  expect(suites.filter(s => s.file.includes('b.test.js')).length).toBe(3);
  expect(suites.filter(s => s.file.includes('c.test.js')).length).toBe(3);
  const log = [];
  for (const suite of suites)
    log.push(suite.configuration.map(p => p.name + '=' + p.value));
  expect(log.join('|')).toBe('worker=A|worker=B|worker=C|worker=A|worker=B|worker=C|worker=A|worker=B|worker=C');

  const log2 = [];
  for (const r of result.results)
    log2.push(r.status);
  expect(log2.join('|')).toBe('passed|failed|failed|failed|passed|failed|failed|failed|passed');
});

it('should emit test annotations', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.js': `
      it('should emit annotation', (test, parameters) => {
        test.fail(true, 'Fail annotation');
      }, async ({}) => {
        expect(true).toBe(false);
      });
    `
  }, { 'trial-run': true });
  expect(result.exitCode).toBe(0);
  expect(result.passed).toBe(1);
  expect(result.report.suites[0].tests[0].annotations).toEqual([{ type: 'fail', description: 'Fail annotation' }]);
});

it('should emit suite annotations', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.js': `
      describe('annotate', test => {
        test.fixme('Fix me!');
      }, () => {
        it('test', async ({}) => {
          expect(true).toBe(false);
        });
      });
    `
  }, { 'trial-run': true });
  expect(result.exitCode).toBe(0);
  expect(result.skipped).toBe(1);
  expect(result.report.suites[0].suites[0].tests[0].annotations).toEqual([{ type: 'fixme', description: 'Fix me!' }]);
});

it('should not restart worker', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.js': `
      it('test1', test => {
        test.fail();
      }, () => {
        expect(true).toBe(false);
      });

      it('test2', test => {
        test.fail();
      }, () => {
        expect(true).toBe(false);
      });
    `
  }, { 'trial-run': true });
  expect(result.exitCode).toBe(0);
  expect(result.report.suites[0].tests[0].workerId).toBe(0);
  expect(result.report.suites[0].tests[1].workerId).toBe(0);
});
