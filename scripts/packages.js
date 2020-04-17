const {GlobSync} = require('glob');
const path = require('path');
const root = path.join(__dirname, '..');
const packages = GlobSync('./packages/*/package.json', {cwd: root})
    .found
    .map(file => {
      const fileName = path.join(root, file);
      const json = require(fileName);
      return {fileName, json};
    });
module.exports = packages;
