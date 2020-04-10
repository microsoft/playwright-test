declare module '@babel/helper-plugin-utils' {
  import type {ConfigAPI, PluginObj} from '@babel/core';
  export function declare(builder: (api: ConfigAPI, options: any, dirname: string) => PluginObj): (api: ConfigAPI, options: any, dirname: string) => PluginObj
}
