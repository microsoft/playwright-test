const describers = require('describers');
const expect = require('expect');
module.exports = {
  expect,
  it: describers.it,
  describe: describers.describe,
  beforeEach: describers.beforeEach,
  afterEach: describers.afterEach,
};
