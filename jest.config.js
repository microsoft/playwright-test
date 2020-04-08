module.exports = {
  projects: [
    {
      displayName: 'e2e demo',
      runner: './packages/e2e',
      testMatch: ['<rootDir>/packages/e2e/demo/**/**.spec.js'],
    },
    {
      displayName: 'e2e tests',
      testMatch: ['<rootDir>/packages/e2e/tests/**/**.spec.js'],
    },
  ]
};