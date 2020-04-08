module.exports = {
  projects: [
    {
      displayName: 'demo',
      runner: '.',
      testMatch: ['<rootDir>/demo/**/**.spec.js'],
    },
    {
      displayName: 'tests',
      testMatch: ['<rootDir>/tests/**/**.spec.js'],
    },
  ]
};