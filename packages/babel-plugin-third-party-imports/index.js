const babelUtils = require('@babel/helper-plugin-utils');
const babel = require('@babel/core');

/**
 * @param {string} modulePath
 * @param {string=} fileName
 * @return {string}
 */
function transformModulePath(modulePath, fileName) {
  if (modulePath.startsWith('.') || modulePath.startsWith('/') || modulePath.startsWith('https://'))
    return modulePath;
  return `https://third_party/${modulePath}`;
}

module.exports = babelUtils.declare(api => {
  return {
    visitor: {
      ImportDeclaration: nodePath => {
        const modulePath = nodePath.node.source.value;
        const transformedPath = transformModulePath(nodePath.node.source.value);
        if (transformedPath === modulePath)
          return;
        const newPath = babel.types.importDeclaration(nodePath.node.specifiers, babel.types.stringLiteral(transformedPath));
        nodePath.replaceWith(newPath);
      },
      ExportNamedDeclaration: nodePath => {
        if (!nodePath.node.source)
          return;
        const modulePath = nodePath.node.source.value;
        const transformedPath = transformModulePath(nodePath.node.source.value);
        if (transformedPath === modulePath)
          return;
        const newPath = babel.types.exportNamedDeclaration(nodePath.node.declaration, nodePath.node.specifiers, babel.types.stringLiteral(transformedPath));
        nodePath.replaceWith(newPath);
      },
      ExportAllDeclaration: nodePath => {
        const modulePath = nodePath.node.source.value;
        const transformedPath = transformModulePath(nodePath.node.source.value);
        if (transformedPath === modulePath)
          return;
        const newPath = babel.types.exportAllDeclaration(babel.types.stringLiteral(transformedPath));
        nodePath.replaceWith(newPath);
      },
    }
  };
});
