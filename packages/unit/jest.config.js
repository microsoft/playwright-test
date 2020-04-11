module.exports = {
  displayName: 'unit',
  rootDir: __dirname,
  runner: 'jest-runner-playwright-unit',
  testMatch: ['<rootDir>/demo/**/**.spec.[jt]s(x)?'],
};
