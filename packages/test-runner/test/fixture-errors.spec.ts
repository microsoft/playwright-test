/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { it, expect } from '@playwright/test-runner';
import './fixtures';

it('should handle fixture timeout', async ({ runTest }) => {
  const { exitCode, output, failed, timedOut } = await runTest('fixture-timeout.js', { timeout: 500 });
  expect(exitCode).toBe(1);
  expect(output).toContain('Timeout of 500ms');
  expect(failed).toBe(1);
  expect(timedOut).toBe(1);
});

it('should handle worker fixture timeout', async ({ runTest }) => {
  const result = await runTest('worker-fixture-timeout.js', { timeout: 500 });
  expect(result.exitCode).toBe(1);
  expect(result.output).toContain('Timeout of 500ms');
});

it('should handle worker fixture error', async ({ runTest }) => {
  const result = await runTest('worker-fixture-error.js');
  expect(result.exitCode).toBe(1);
  expect(result.output).toContain('Worker failed');
});
