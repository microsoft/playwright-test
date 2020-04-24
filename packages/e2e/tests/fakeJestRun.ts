import {TestScheduler, TestWatcher} from '@jest/core';
import {createContext} from 'jest-runtime';
import path from 'path';
import {DefaultReporter, SummaryReporter} from '@jest/reporters';
import {tmpdir} from 'os';
const cacheDirectory = path.join(tmpdir(), 'pw_e2e_cache');

export async function fakeJestRun(paths: string[], config: Partial<import('@jest/types').Config.GlobalConfig> = {}) {
  const scheduler = new TestScheduler({...makeGlobalConfig(), ...config}, {
    startRun: config => void 0
  }, {
    firstRun: true,
    previousSuccess: false,
  });
  scheduler.removeReporter(DefaultReporter);
  scheduler.removeReporter(SummaryReporter);
  const context = await createContext(makeProjectConfig(), {
    maxWorkers: 1,
    watchman: false,
  });
  const watcher = new TestWatcher({ isWatchMode: false });
  const results = await scheduler.scheduleTests(paths.map(filePath => ({path: path.join(__dirname, 'assets', filePath), context})), watcher);
  jest.resetModules();
  return results;
}

function makeProjectConfig(): import('@jest/types').Config.ProjectConfig {
  return {
    automock: false,
    browser: false,
    cache: false,
    cacheDirectory,
    clearMocks: false,
    coveragePathIgnorePatterns: [],
    cwd: 'cwd',
    detectLeaks: false,
    detectOpenHandles: false,
    errorOnDeprecated: false,
    extraGlobals: [],
    forceCoverageMatch: [],
    globals: {},
    haste: {
      providesModuleNodeModules: []
    },
    moduleDirectories: [],
    moduleFileExtensions: [],
    moduleNameMapper: [],
    modulePathIgnorePatterns: [],
    name: 'name',
    prettierPath: 'pettier',
    resetMocks: false,
    resetModules: false,
    restoreMocks: false,
    rootDir: 'root',
    roots: [],
    runner: path.join(__dirname, '..'),
    setupFiles: [],
    setupFilesAfterEnv: [],
    skipFilter: false,
    snapshotSerializers: [],
    testEnvironment: '',
    testEnvironmentOptions: {},
    testMatch: [],
    testLocationInResults: false,
    testPathIgnorePatterns: [],
    testRegex: [],
    testRunner: 'testRunner',
    testURL: 'testUrl',
    timers: 'real',
    transform: [],
    transformIgnorePatterns: [],
    watchPathIgnorePatterns: [],
  };
}

/**
 * @return {import('@jest/types').Config.GlobalConfig}
 */
function makeGlobalConfig(): import('@jest/types').Config.GlobalConfig {
  return {
    bail: 0,
    changedFilesWithAncestor: false,
    collectCoverage: false,
    collectCoverageFrom: [],
    coverageDirectory: 'coverage',
    coverageProvider: 'v8',
    coverageReporters: [],
    detectLeaks: false,
    detectOpenHandles: false,
    expand: false,
    findRelatedTests: false,
    forceExit: false,
    json: false,
    lastCommit: false,
    logHeapUsage: false,
    listTests: false,
    maxConcurrency: 1,
    maxWorkers: 1,
    noStackTrace: false,
    nonFlagArgs: [],
    notify: false,
    notifyMode: 'always',
    onlyChanged: false,
    onlyFailures: false,
    passWithNoTests: false,
    projects: [],
    runTestsByPath: false,
    rootDir: 'root',
    skipFilter: false,
    errorOnDeprecated: false,
    testFailureExitCode: 1,
    testPathPattern: '',
    testSequencer: '',
    updateSnapshot: 'all',
    useStderr: false,
    watch: false,
    watchAll: false,
    watchman: false,
  };
}
