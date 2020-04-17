const expect = require('expect');
const fs = require('fs');
const packages = require('./packages');
const names = new Set(packages.filter(({json}) => !json.private).map(({json}) => json.name));
let anyError = false;
for (const {fileName, json} of packages) {
  if (json.private)
    continue;
  let errors = false;
  checkField('license', 'MIT');
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