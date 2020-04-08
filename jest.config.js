module.exports = {
  projects: [
    {
      displayName: 'e2e demo',
      runner: './packages/e2e',
      testMatch: ['<rootDir>/packages/e2e/demo/**/**.spec.[jt]s'],
    },
    {
      displayName: 'e2e tests',
      testMatch: ['<rootDir>/packages/e2e/tests/**/**.spec.[jt]s'],
    },
    {
      displayName: 'describers',
      testMatch: ['<rootDir>/packages/describers/tests/**/**.spec.[jt]s'],
    },
  ]
};