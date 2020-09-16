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

import crypto from 'crypto';
import { registrations, fixturesForCallback, rerunRegistrations, matrix } from './fixtures';
import { Test, Suite, serializeConfiguration } from './test';
import { RunnerConfig } from './runnerConfig';

type ParseResult = {
  suite?: Suite,
  parseError?: {error: any, file: string}
}

export function generateTests(suites: Suite[], config: RunnerConfig): Suite {
  const rootSuite = new Suite('');
  let grep: RegExp = null;
  if (config.grep) {
    const match = config.grep.match(/^\/(.*)\/(g|i|)$|.*/);
    grep = new RegExp(match[1] || match[0], match[2]);
  }

  for (const suite of suites) {
    // Rerun registrations so that only fixutres for this file
    // are registreds
    rerunRegistrations(suite.file);
    const workerGeneratorConfigurations = new Map();

    // Name each test.
    suite._renumber();

    for (const test of suite._allTests()) {
      // Get all the fixtures that the test needs.
      let fixtures: string[] = [];
      try {
        fixtures = fixturesForCallback(test.fn);
      } catch (error) {
        // It is totally fine if the test can't parse it's fixtures, worker will report
        // this test as failing, not need to quit on the suite.
      }
      // For worker fixtures, trace them to their registrations to make sure
      // they are compatible.
      const registrationsHash = computeWorkerRegistrationHash(fixtures);

      const generatorConfigurations = [];
      // For generator fixtures, collect all variants of the fixture values
      // to build different workers for them.
      for (const name of fixtures) {
        const values = matrix[name];
        if (!values)
          continue;
        const state = generatorConfigurations.length ? generatorConfigurations.slice() : [[]];
        generatorConfigurations.length = 0;
        for (const gen of state) {
          for (const value of values)
            generatorConfigurations.push([...gen, { name, value }]);
        }
      }

      // No generator fixtures for test, include empty set.
      if (!generatorConfigurations.length)
        generatorConfigurations.push([]);

      for (const configuration of generatorConfigurations) {
        // Serialize configuration as readable string, we will use it as a hash.
        const configurationString = serializeConfiguration(configuration);
        const workerHash = registrationsHash + '@' + configurationString;
        // Allocate worker for this configuration, add test into it.
        if (!workerGeneratorConfigurations.has(workerHash))
          workerGeneratorConfigurations.set(workerHash, { configuration, configurationString, tests: new Set() });
        workerGeneratorConfigurations.get(workerHash).tests.add(test);
      }
    }

    // Clone the suite as many times as we have repeat each.
    for (let i = 0; i < config.repeatEach; ++i) {
      // Clone the suite as many times as there are worker hashes.
      // Only include the tests that requested these generations.
      for (const [workerHash, {configuration, configurationString, tests}] of workerGeneratorConfigurations.entries()) {
        const clone = cloneSuite(suite, tests, grep);
        rootSuite._addSuite(clone);
        clone.title = '';
        clone.configuration = configuration;
        clone._configurationString = configurationString + `#repeat-${i}#`;
        clone._workerHash = workerHash;
        clone._assignIds();
      }
    }
  }
  filterOnly(rootSuite);
  return rootSuite;
}

function filterOnly(suite: Suite) {
  const onlySuites = suite.suites.filter((child: Suite) => filterOnly(child) || child._only);
  const onlyTests = suite.tests.filter((test: Test) => test._only);
  if (onlySuites.length || onlyTests.length) {
    suite.suites = onlySuites;
    suite.tests = onlyTests;
    return true;
  }
  return false;
}

function cloneSuite(suite: Suite, tests: Set<Test>, grep: RegExp | null) {
  const copy = suite._clone();
  for (const entry of suite._entries) {
    if (entry instanceof Suite) {
      copy._addSuite(cloneSuite(entry, tests, grep));
    } else {
      const test = entry;
      if (!tests.has(test))
        continue;
      if (grep && !grep.test(test.fullTitle()))
        continue;
      const testCopy = test._clone();
      copy._addTest(testCopy);
    }
  }
  return copy;
}

function computeWorkerRegistrationHash(fixtures: string[]): string {
  // Build worker hash - location of all worker fixtures as seen by this file.
  const hash = crypto.createHash('sha1');
  for (const fixture of fixtures) {
    const registration = registrations.get(fixture);
    if (registration.scope !== 'worker')
      continue;
    hash.update(registration.location);
  }
  return hash.digest('hex');
}
