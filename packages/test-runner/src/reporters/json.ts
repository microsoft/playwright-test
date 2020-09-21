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

import * as fs from 'fs';
import path from 'path';
import { Config } from '../config';
import { Reporter } from '../reporter';
import { TestRun } from '../ipc';
import { Test, Suite, Spec } from '../test';

export interface SerializedSuite {
  title: string;
  file: string;
  specs: ReturnType<JSONReporter['_serializeTestSpec']>[];
  suites?: SerializedSuite[];
}

export type ReportFormat = {
  config: Config;
  errors?: { file: string, error: any }[];
  suites?: SerializedSuite[];
};

class JSONReporter implements Reporter {
  config: Config;
  suite: Suite;
  private _errors: { file: string, error: any }[] = [];

  onBegin(config: Config, suite: Suite) {
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

  onTestEnd(test: Test, result: TestRun): void {
  }

  onError(error: any, file?: string): void {
    this._errors.push({ file, error });
  }

  onEnd() {
    outputReport({
      config: this.config,
      suites: this.suite.suites.map(suite => this._serializeSuite(suite)).filter(s => s),
      errors: this._errors
    });
  }

  private _serializeSuite(suite: Suite): null | SerializedSuite {
    if (!suite.findSpec(test => true))
      return null;
    const suites = suite.suites.map(suite => this._serializeSuite(suite)).filter(s => s);
    return {
      title: suite.title,
      file: suite.file,
      specs: suite.specs.map(test => this._serializeTestSpec(test)),
      suites: suites.length ? suites : undefined,
    };
  }

  private _serializeTestSpec(spec: Spec) {
    return {
      title: spec.title,
      file: spec.file,
      tests: spec.tests.map(r => this._serializeTest(r))
    };
  }

  private _serializeTest(test: Test) {
    return {
      parameters: test.parameters,
      runs: test.runs.map(r => this._serializeTestRun(r))
    };
  }

  private _serializeTestRun(result: TestRun) {
    return {
      workerIndex: result.workerIndex,
      slow: result.slow,
      timeout: result.timeout,
      annotations: result.annotations,
      expectedStatus: result.expectedStatus,

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
