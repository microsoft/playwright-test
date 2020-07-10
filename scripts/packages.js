/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
