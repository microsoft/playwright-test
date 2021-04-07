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

import { test, expect } from './config';

test('no options by default', async ({ page, a }) => {
  expect(page.viewportSize()).toEqual({ width: 1280, height: 720 });
  expect(a).toBe(42);
});

const viewportOptions = { contextOptions: { viewport: { width: 500, height: 600} } };
test('overridden contextOptions', viewportOptions, async ({ page, a }) => {
  expect(page.viewportSize()).toEqual({ width: 500, height: 600 });
  expect(a).toBe(42);
});
