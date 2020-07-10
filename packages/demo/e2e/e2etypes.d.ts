/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
type PlaywrightState = {
  page: import('playwright').Page,
  context: import('playwright').BrowserContext,
};
declare let expect : typeof import('expect');
declare let it : import('describers').It<PlaywrightState>;
declare let describers : typeof import('describers').describe;
declare let beforeEach : import('describers').BeforeOrAfter<PlaywrightState>;
