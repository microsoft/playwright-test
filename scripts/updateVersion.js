const version = process.argv[2];
if (!version) {
  console.error('must specify a version');
  process.exit(1);
}
const {GlobSync} = require('glob');
const path = require('path');
const root = path.join(__dirname, '..');
const fs = require('fs');
const packages = GlobSync('./packages/*/package.json', {cwd: root})
    .found
    .map(file => {
      const fileName = path.join(root, file);
      const json = require(fileName);
      return {fileName, json};
    });
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
