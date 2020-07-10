/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
declare module 'md5.js' {
  class MD5 {
    update(data: string): MD5;
    digest(): Buffer;
    digest(encoding: string): string;
  }
  export = MD5;
}
