it('is a basic test with the page', async ({page}) => {
  expect(await page.evaluate(() => 1 + 2)).toBe(3);
});

it('is not firefox', async ({page}) => {
  expect(await page.evaluate(() => navigator.userAgent)).toContain('WebKit');
});
it('should use the window width and height from the playwight.config.js', async ({ page }) => {
  expect(await page.evaluate(() => window.innerWidth)).toBe(1234);
  expect(await page.evaluate(() => window.innerHeight)).toBe(789);
});