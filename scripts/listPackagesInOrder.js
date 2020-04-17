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
