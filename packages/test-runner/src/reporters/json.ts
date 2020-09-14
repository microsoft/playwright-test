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

import { Configuration, Suite, Test, TestResult } from '../test';
import * as fs from 'fs';
import path from 'path';
import { RunnerConfig } from '../runnerConfig';
import { Reporter } from '../reporter';

interface SerializedSuite {
  title: string;
  file: string;
  configuration: Configuration;
  tests: ReturnType<JSONReporter['_serializeTest']>[];
  suites?: SerializedSuite[];
}

export type ReportFormat = {
  config: RunnerConfig;
  parseError?: {file: string, error: any};
  suites?: SerializedSuite[];
};

class JSONReporter implements Reporter {
  config: RunnerConfig;
  suite: Suite;

  onBegin(config: RunnerConfig, suite: Suite) {
    this.config = config;
    this.suite = suite;
  }

  onTimeout(timeout) {
    this.onEnd();
  }

  onTestStdOut(test: Test, chunk: string | Buffer) {
  }

  onTestStdErr(test: Test, chunk: string | Buffer) {
  }
  onTestBegin(test: Test): void {
  }
  onTestEnd(test: Test, result: TestResult): void {
  }
  onParseError(file: string, error: any): void {
    outputReport({
      config: this.config,
      parseError: {file, error},
    });
  }

  onEnd() {
    outputReport({
      config: this.config,
      suites: this.suite.suites.map(suite => this._serializeSuite(suite)).filter(s => s)
    });
  }

  private _serializeSuite(suite: Suite): null | SerializedSuite {
    if (!suite.findTest(test => true))
      return null;
    const suites = suite.suites.map(suite => this._serializeSuite(suite)).filter(s => s);
    return {
      title: suite.title,
      file: suite.file,
      configuration: suite.configuration,
      tests: suite.tests.map(test => this._serializeTest(test)),
      suites: suites.length ? suites : undefined
    };
  }

  private _serializeTest(test: Test) {
    return {
      title: test.title,
      file: test.file,
      only: test.isOnly(),
      slow: test.isSlow(),
      timeout: test.timeout(),
      results: test.results.map(r => this._serializeTestResult(r))
    };
  }

  private _serializeTestResult(result: TestResult) {
    return {
      status: result.status,
      duration: result.duration,
      error: result.error,
      stdout: result.stdout.map(s => stdioEntry(s)),
      stderr: result.stderr.map(s => stdioEntry(s)),
      data: result.data
    };
  }
}

function outputReport(report: ReportFormat) {
  const reportString = JSON.stringify(report, undefined, 2);
  if (process.env.PWRUNNER_JSON_REPORT) {
    fs.mkdirSync(path.dirname(process.env.PWRUNNER_JSON_REPORT), { recursive: true });
    fs.writeFileSync(process.env.PWRUNNER_JSON_REPORT, reportString);
  } else {
    console.log(reportString);
  }
}

function stdioEntry(s: string | Buffer): any {
  if (typeof s === 'string')
    return { text: s };
  return { buffer: s.toString('base64') };
}

export default JSONReporter;
