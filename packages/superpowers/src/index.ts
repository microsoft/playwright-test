
import type {Request, Page, Route} from 'playwright';
type RequsetProperties = "url"|"headers"|"failure"|"isNavigationRequest"|"postData";
type RequestObject = {
  [key in RequsetProperties]: ReturnType<Request[key]>
}
type RequestApi = {
  [key in RequsetProperties]: Request[key];
}
type RouteApi = {
  fulfill: Route["fulfill"];
  abort: Route["abort"];
  continue: Route["fulfill"];
  request(): RequestApi;
}

export async function installSuperpowers(page: Page) {
  let lastRouteId = 0;
  let routes = new Map<number, Route>();
  const api: {[key: string]: any} = {
    keyboard: {
      type: page.keyboard.type.bind(page.keyboard),
      down: page.keyboard.down.bind(page.keyboard),
      press: page.keyboard.press.bind(page.keyboard),
      up: page.keyboard.up.bind(page.keyboard),
      insertText: page.keyboard.insertText.bind(page.keyboard),
    },
    mouse: {
      click: page.mouse.click.bind(page.mouse),
      down: page.mouse.down.bind(page.mouse),
      move: page.mouse.move.bind(page.mouse),
      up: page.mouse.up.bind(page.mouse),
      dblclick: page.mouse.dblclick.bind(page.mouse),
    },
    network: {
      route: async (urlOrRegexOrPredicate: string, handler: {isFunction: true, index: number}) => {
        if (!handler.isFunction)
          throw new Error('handler must be a function');
        await page.route(urlOrRegexOrPredicate, async (route, request) => {
          const routeId = ++lastRouteId;
          routes.set(routeId, route);
          const requestObj: RequestObject = {
            failure: request.failure(),
            headers: request.headers(),
            isNavigationRequest: request.isNavigationRequest(),
            postData: request.postData(),
            url: request.url(),
          };
          await page.evaluate(async ({handlerIndex, requestObj, routeId}) => {
            const superpowers = (window as any)['__superpowers__'];
            const request: RequestApi = {
              url() { return requestObj.url },
              headers() { return requestObj.headers },
              failure() { return requestObj.failure },
              postData() { return requestObj.postData },
              isNavigationRequest() { return requestObj.isNavigationRequest },
            }
            const route: RouteApi = {
              fulfill: obj => superpowers('network', '_fulfill', routeId, obj),
              abort: obj => superpowers('network', '_abort', routeId, obj),
              continue: obj => superpowers('network', '_continue', routeId, obj),
              request: () => request,
            };
            superpowers.functions.get(handlerIndex).call(null, route, request);
          }, {
            handlerIndex: handler.index,
            requestObj,
            routeId,
          }).catch(e => null);
        });
      },
      async _fulfill(routeId: number, params: Parameters<Route["fulfill"]>[0]) {
        const route = routes.get(routeId);
        if (!route)
          return;
        await route.fulfill(params || undefined);
        routes.delete(routeId);
      },
      async _abort(routeId: number, params: Parameters<Route["abort"]>[0]) {
        const route = routes.get(routeId);
        if (!route)
          return;
        await route.abort(params || undefined);
        routes.delete(routeId);
      },
      async _continue(routeId: number, params: Parameters<Route["continue"]>[0]) {
        const route = routes.get(routeId);
        if (!route)
          return;
        await route.continue(params || undefined);
        routes.delete(routeId);
      }
    }
  }
  await page.exposeFunction('__superpowers__', (category: string, method: string, ...args: any) => {
    return api[category][method](...args);
  });
  let script = [];
  script.push(`{`);
  script.push(`__superpowers__.functions = new Map()`);
  script.push(`__superpowers__.lastIndex = 0`);
  script.push(`const serialize = ${function(value: any) {
    if (value instanceof RegExp) {
      return {
        isRegex: true,
        source: value.source,
        flags: value.flags,
      };
    }
    if (value instanceof Function) {
      const superpowers = (window as any)['__superpowers__'];
      const index = superpowers.lastIndex++;
      superpowers.functions.set(index, value);
      return {
        isFunction: true,
        index
      };
    }
    return value;
  }.toString()}`)
  for (const [category, value] of Object.entries(api)) {
    script.push(`window.${category} = {};`);
    for (const method of Object.keys(value)) {
      if (method.startsWith('_'))
        continue;
      script.push(`window.${category}.${method} = (...args) => __superpowers__('${category}', '${method}', ...args.map(serialize));`);
    }
  }
  script.push('}');
  const initScript = script.join('\n');
  await page.addInitScript(initScript);
  await page.evaluate(initScript);
}
