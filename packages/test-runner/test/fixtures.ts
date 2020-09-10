/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { registerFixture } from '@playwright/test-runner';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';

const removeFolderAsync = promisify(rimraf);

export type RunResult = {
  exitCode: number,
  output: string,
  passed: number,
  failed: number,
  timedOut: number,
  expectedFlaky: number,
  unexpectedFlaky: number,
  skipped: number,
  report: any
};

async function runTest(reportFile: string, outputDir: string, filePath: string, params: any = {}): Promise<RunResult> {
  const testProcess = spawn('node', [
    path.join(__dirname, '..', 'cli.js'),
    path.join(__dirname, 'assets', filePath),
    '--output=' + outputDir,
    '--reporter=dot,json',
    '--jobs=2',
    ...Object.keys(params).map(key => `--${key}=${params[key]}`)
  ], {
    env: {
      ...process.env,
      PW_OUTPUT_DIR: outputDir,
      PWRUNNER_JSON_REPORT: reportFile,
    }
  });
  let output = '';
  testProcess.stderr.on('data', chunk => {
    output += String(chunk);
  });
  testProcess.stdout.on('data', chunk => {
    output += String(chunk);
  });
  const status = await new Promise<number>(x => testProcess.on('close', x));
  const passed = (/(\d+) passed/.exec(output.toString()) || [])[1];
  const failed = (/(\d+) failed/.exec(output.toString()) || [])[1];
  const timedOut = (/(\d+) timed out/.exec(output.toString()) || [])[1];
  const expectedFlaky = (/(\d+) expected flaky/.exec(output.toString()) || [])[1];
  const unexpectedFlaky = (/(\d+) unexpected flaky/.exec(output.toString()) || [])[1];
  const skipped = (/(\d+) skipped/.exec(output.toString()) || [])[1];
  let report;
  try {
    report = JSON.parse(fs.readFileSync(reportFile).toString());
  } catch (e) {
    const error = new Error(output);
    (error as any).exitCode = status;
    throw error;
  }
  return {
    exitCode: status,
    output,
    passed: parseInt(passed, 10),
    failed: parseInt(failed || '0', 10),
    timedOut: parseInt(timedOut || '0', 10),
    expectedFlaky: parseInt(expectedFlaky || '0', 10),
    unexpectedFlaky: parseInt(unexpectedFlaky || '0', 10),
    skipped: parseInt(skipped || '0', 10),
    report
  };
}

declare global {
  interface TestState {
    outputDir: string;
    runTest: (filePath: string, options?: any) => Promise<RunResult>;
  }
}

registerFixture('outputDir', async ({ parallelIndex }, testRun) => {
  await testRun(path.join(__dirname, 'test-results', String(parallelIndex)));
});

registerFixture('runTest', async ({ outputDir }, testRun) => {
  const reportFile = path.join(outputDir, `results.json`);
  await removeFolderAsync(outputDir).catch(e => { });
  await testRun(runTest.bind(null, reportFile, outputDir));
});
