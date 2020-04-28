it('only passes in chrome', async ({page}) => {
  expect(await page.evaluate(() => navigator.userAgent)).toContain('Chrome');
});
