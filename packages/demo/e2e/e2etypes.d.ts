type PlaywrightState = {
  page: import('playwright').Page,
  context: import('playwright').BrowserContext,
};
declare var expect : typeof import('expect');
declare var it : import('describers').It<PlaywrightState>;
declare var describers : typeof import('describers').describe;
declare var beforeEach : import('describers').BeforeOrAfter<PlaywrightState>;
