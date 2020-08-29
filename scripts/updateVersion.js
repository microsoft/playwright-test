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

const version = process.argv[2];
if (!version) {
  console.error('must specify a version');
  process.exit(1);
}
const fs = require('fs');
const packages = require('./packages');
const names = new Set(packages.filter(({json}) => !json.private).map(({json}) => json.name));
for (const {fileName, json} of packages) {
  if (!json.private)
    json.version = version;
  const dependencyTypes = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies'];
  for (const dependencyType of dependencyTypes) {
    for (const dep in json[dependencyType]) {
      if (names.has(dep))
        json[dependencyType][dep] = version;
    }
  }
  fs.writeFileSync(fileName, JSON.stringify(json, undefined, 2) + '\n', 'utf8');
}
