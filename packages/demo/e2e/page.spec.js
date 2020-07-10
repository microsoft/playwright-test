/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
it('is a basic test with the page', async ({page}) => {
  expect(await page.evaluate(() => 1 + 2)).toBe(3);
});

it('is not firefox', async ({page}) => {
  expect(await page.evaluate(() => navigator.userAgent)).toContain('WebKit');
});
