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

const expect = require('expect');
const fs = require('fs');
const packages = require('./packages');
const names = new Set(packages.filter(({json}) => !json.private).map(({json}) => json.name));
let anyError = false;
for (const {fileName, json} of packages) {
  if (json.private)
    continue;
  let errors = false;
  checkField('license', 'Apache-2.0');
  checkField('author', {name: 'Microsoft Corporation'});
  checkField('repository', 'github:Microsoft/playwright-runner');
  if (errors) {
    console.log('writing', fileName);
    fs.writeFileSync(fileName, JSON.stringify(json, undefined, 2) + '\n', 'utf8');
  }
  function checkField(fieldName, expected) {
    const value = json[fieldName];
    if (JSON.stringify(value) === JSON.stringify(expected))
      return;
    json[fieldName] = expected;
    errors = true;
    anyError = true;
  }
}

if (anyError)
  process.exit(1);