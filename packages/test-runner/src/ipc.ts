/**
 * Copyright Microsoft Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type Configuration = { name: string, value: string }[];

export type TestStatus = 'passed' | 'failed' | 'timedOut' | 'skipped';

export type TestResult = {
  duration: number;
  status?: TestStatus;
  error?: any;
  stdout: (string | Buffer)[];
  stderr: (string | Buffer)[];
  data: any;
}

export type TestBeginPayload = {
  id: string;
  skipped: boolean;
  flaky: boolean
  slow: boolean;
  expectedStatus: TestStatus;
  annotations: any[];
  timeout: number;
};

export type TestEndPayload = {
  id: string;
  result: TestResult;
}

export type TestRunnerEntry = {
  file: string;
  ids: string[];
  configurationString: string;
  configuration: Configuration;
  hash: string;
};
