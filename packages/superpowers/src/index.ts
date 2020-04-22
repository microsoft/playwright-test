export async function installSuperpowers(page: import('playwright').Page) {
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
  }
  await page.exposeFunction('__superpowers__', (category: string, method: string, ...args: any) => {
    return api[category][method](...args);
  });
  let script = [];
  for (const [category, value] of Object.entries(api)) {
    script.push(`window.${category} = {};`);
    for (const method of Object.keys(value)) {
      script.push(`window.${category}.${method} = (...args) => __superpowers__('${category}', '${method}', ...args);`);
    }
  }
  const initScript = script.join('\n');
  await page.addInitScript(initScript);
  await page.evaluate(initScript);
}
