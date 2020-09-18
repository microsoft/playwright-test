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

import { Test, Suite, TestVariant } from "./test";

export class RunnerTest extends Test {
  constructor(title: string, fn: Function, suite: RunnerSuite) {
    super(title, fn, suite);
  }
}

export class RunnerSuite extends Suite {
  constructor(title: string, parent?: RunnerSuite) {
    super(title, parent);
  }

  _assignIds() {
    this.findTest((test: RunnerTest) => {
      for (const run of test.variants as RunnerTestVariant[])
        run._id = `${test._ordinal}@${run.spec.file}::[${run._parametersString}]`;
    });
  }
}

export class RunnerTestVariant extends TestVariant {
  _parametersString: string;
  _workerHash: string;
  _id: string;

  constructor(spec: RunnerTest) {
    super(spec);
  }
}
