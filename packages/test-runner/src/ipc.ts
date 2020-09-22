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

export type Parameters = { name: string, value: string }[];

export type TestStatus = 'passed' | 'failed' | 'timedOut' | 'skipped';

export type TestResult = {
  retryNumber: number;
  workerIndex: number;
  duration: number;
  status?: TestStatus;
  error?: any;
  stdout: (string | Buffer)[];
  stderr: (string | Buffer)[];
  data: any;
};

export type TestAnnotations = {
  skipped: boolean;
  flaky: boolean;
  slow: boolean;
  expectedStatus: TestStatus;
  timeout: number;
  annotations: any[];
};

export type TestBeginPayload = {
  testId: string;
  retryNumber: number;
  // Collected annotations, present for first run only (zero retryNumber).
  annotations?: TestAnnotations;
};

export type TestEndPayload = {
  testId: string;
  result: TestResult;
};

export type TestEntry = {
  testId: string;
  retryNumber: number;
  // Annotations are present for retries only (non-zero retryNumber).
  annotations?: TestAnnotations;
};

export type RunPayload = {
  file: string;
  parametersString: string;
  parameters: Parameters;
  hash: string;
  entries: TestEntry[];
};

export type DonePayload = {
  failedTestId?: string;
  fatalError?: any;
  remaining: TestEntry[];
};

export type TestOutputPayload = {
  testId?: string;
  text?: string;
  buffer?: string;
};
