/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
