/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
it('is a basic test with the page', async ({page}) => {
  const x : number = await page.evaluate(() => 1 + 2);
  expect(x).toEqual(3);
});
