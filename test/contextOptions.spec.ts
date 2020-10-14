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

import { folio, expect } from '../out';

const { it: it1 } = folio;
it1('no options by default', async ({ page }) => {
  expect(page.viewportSize()).toEqual({ width: 1280, height: 720 });
});

const fixtures = folio.extend();
fixtures.contextOptions.override(async ({contextOptions}, run) => {
  await run({ ...contextOptions, viewport: { width: 500, height: 600} });
});
const { it: it2 } = fixtures.build();

it2('overridden contextOptions', async ({ page }) => {
  expect(page.viewportSize()).toEqual({ width: 500, height: 600 });
});
