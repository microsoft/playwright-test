/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
declare module '@babel/helper-plugin-utils' {
  import type {ConfigAPI, PluginObj} from '@babel/core';
  export function declare(builder: (api: ConfigAPI, options: any, dirname: string) => PluginObj): (api: ConfigAPI, options: any, dirname: string) => PluginObj
}
