/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { transformFileAsync } from '@babel/core';
import { requireResolve } from './requireResolve';

export async function transformLocalFile(filePath: string) : Promise<string>{
  const resolvedPath = await requireResolve(filePath);
  const plugins = [];

  const tsPlugin = attemptToToGetModule('@babel/plugin-transform-typescript');
  if (tsPlugin)
    plugins.push([tsPlugin, {isTSX: true}]);

  const jsxPlugin = attemptToToGetModule('@babel/plugin-transform-react-jsx');
  if (jsxPlugin)
    plugins.push(jsxPlugin);
  plugins.push('babel-plugin-third-party-imports');
  const result = await transformFileAsync(resolvedPath, {
    cwd: __dirname,
    plugins
  });
  if (!result || !result.code)
    throw new Error(`could not transform ${filePath}`);
  return result.code;

  function attemptToToGetModule(moduleName: string) {
    try {
      return require(require.resolve(moduleName, {paths: [filePath, __filename]}));
    } catch (e) {
      return null;
    }
  }
}
