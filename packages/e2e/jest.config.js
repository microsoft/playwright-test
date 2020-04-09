module.exports = {
  projects: [{
    displayName: 'e2e tests',
    rootDir: __dirname,
    testMatch: ['<rootDir>/tests/**/**.spec.[jt]s'],
  }, {
    displayName: 'e2e demo',
    rootDir: __dirname,
    runner: 'jest-runner-playwright-e2e',
    testMatch: ['<rootDir>/demo/**/**.spec.[jt]s'],
  }]
};
