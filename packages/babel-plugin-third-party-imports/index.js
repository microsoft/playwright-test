/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const babelUtils = require('@babel/helper-plugin-utils');
const babel = require('@babel/core');

/**
 * @param {string} moduleName
 * @param {string=} fileName
 * @return {string}
 */
function transformModulePath(moduleName, fileName = '') {
  if (moduleName.startsWith('.') || moduleName.startsWith('/') || moduleName.startsWith('https://'))
    return moduleName;
  return `https://third_party/?name=${moduleName}&from=${fileName}`;
}

module.exports = babelUtils.declare(api => {
  return {
    visitor: {
      ImportDeclaration: (nodePath, /** @type {{filename?: string}} */ {filename}) => {
        const modulePath = nodePath.node.source.value;
        const transformedPath = transformModulePath(nodePath.node.source.value, filename);
        if (transformedPath === modulePath)
          return;
        const newPath = babel.types.importDeclaration(nodePath.node.specifiers, babel.types.stringLiteral(transformedPath));
        nodePath.replaceWith(newPath);
      },
      ExportNamedDeclaration: (nodePath, /** @type {{filename?: string}} */ {filename}) => {
        if (!nodePath.node.source)
          return;
        const modulePath = nodePath.node.source.value;
        const transformedPath = transformModulePath(nodePath.node.source.value, filename);
        if (transformedPath === modulePath)
          return;
        const newPath = babel.types.exportNamedDeclaration(nodePath.node.declaration, nodePath.node.specifiers, babel.types.stringLiteral(transformedPath));
        nodePath.replaceWith(newPath);
      },
      ExportAllDeclaration: (nodePath, /** @type {{filename?: string}} */ {filename}) => {
        const modulePath = nodePath.node.source.value;
        const transformedPath = transformModulePath(nodePath.node.source.value, filename);
        if (transformedPath === modulePath)
          return;
        const newPath = babel.types.exportAllDeclaration(babel.types.stringLiteral(transformedPath));
        nodePath.replaceWith(newPath);
      },
    }
  };
});
