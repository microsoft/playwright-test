/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { it } from 'playwright-runner';
import path from 'path';
import expect from 'expect';
import { pathToFileURL } from 'url';
const url = pathToFileURL(path.join(__dirname, '..', 'www', 'index.html')).toString();

it('is a basic test with the page', async ({page}) => {
  await page.goto(url);
  const content = await page.evaluate(() => document.body.innerText);
  expect(content).toBe('There is no content.');
});
