module.exports = {
  projects: [{
    displayName: 'demo unit',
    rootDir: __dirname,
    runner: 'jest-runner-playwright-unit',
    testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  },{
    displayName: 'demo e2e',
    rootDir: __dirname,
    runner: 'jest-runner-playwright-e2e',
    testMatch: ['**/__tests__/**/e2e/**/*.[jt]s?(x)', '**/e2e/**/?(*.)+(spec|test).[jt]s?(x)' ],
  }]
};
