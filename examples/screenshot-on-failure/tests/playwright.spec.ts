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

import fs from 'fs';
import path from 'path';
import 'playwright-runner';
import {registerFixture} from 'playwright-runner';

registerFixture('page', async ({context}, runTest, info) => {
  const page = await context.newPage();
  await runTest(page);
  const {test, config, result} = info;
  if (result.status === 'failed' || result.status === 'timedOut') {
    const relativePath = path.relative(config.testDir, test.file).replace(/\.spec\.[jt]s/, '');
    const sanitizedTitle = test.title.replace(/[^\w\d]+/g, '_');
    const assetPath = path.join(config.outputDir, relativePath, sanitizedTitle) + '-failed.png';
    fs.mkdirSync(path.dirname(assetPath), {
      recursive: true
    });
    await page.screenshot({ path: assetPath});
  }
  await page.close();
});

it('is a basic test with the page', async ({page}) => {
  await page.setContent(`<div style="height: 500px; background-color: red">
    Failed!
  </div>`);
  throw new Error('wrong!');
});