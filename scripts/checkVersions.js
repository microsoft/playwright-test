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
const fs = require('fs');
const packages = require('./packages');
const names = new Set(packages.filter(({json}) => !json.private).map(({json}) => json.name));

/**
 * @param {string=} version
 * @param {boolean=} write
 */
module.exports = function(version, write) {
  if (!version)
    version = packages.find(p => !p.json.private).json.version;
  for (const { fileName, json } of packages) {
    const original = JSON.stringify(json, undefined, 2) + '\n';
    if (!json.private)
      json.version = version;

    const dependencyTypes = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies'];
    for (const dependencyType of dependencyTypes) {
      for (const dep in json[dependencyType]) {
        if (names.has(dep) && !json[dependencyType][dep].startsWith('.'))
          json[dependencyType][dep] = version;
      }
    }
    const goodContent = JSON.stringify(json, undefined, 2) + '\n';
    if (goodContent !== original) {
      if (write)
        fs.writeFileSync(fileName, goodContent, 'utf8');
      else
        throw new Error(`Version number mismatch. Run yarn update-version <version>`);
    }
  }
};