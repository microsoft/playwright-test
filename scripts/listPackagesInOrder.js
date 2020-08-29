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

const path = require('path');
const packages = require('./packages');
const names = new Set(packages.filter(({json}) => !json.private).map(({json}) => json.name));
const packageNodes = [];
for (const {fileName, json} of packages) {
  if (json.private)
    continue;
  packageNodes.push({
    dir: path.dirname(fileName),
    name: json.name,
    dependencies: new Set(Object.keys(json.dependencies || {}).filter(key => names.has(key)))
  });
}
while (packageNodes.length) {
  const index = packageNodes.findIndex(p => !p.dependencies.size);
  if (index === -1) {
    console.error('There is a dependency cycle!');
    process.exit(1);
  }
  const [{name, dir}] = packageNodes.splice(index, 1);
  console.log(dir);
  for (const node of packageNodes)
    node.dependencies.delete(name);
}
