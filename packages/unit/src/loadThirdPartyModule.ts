import * as browserify from 'browserify';
import { promisify } from 'util';
import validJSIdentifier from './validJSIdentifier';

async function getBundledModule(moduleName: string, resolvedModulePath: string) {
  const bundle = new browserify();
  bundle.require(resolvedModulePath, {expose: moduleName});
  const buffer = await promisify(bundle.bundle.bind(bundle))();
  return buffer;
}

export async function findAndBundleModule(moduleName: string, parentFile: string) {
  const resolvedModulePath = require.resolve(moduleName, {paths: [parentFile]});
  const buffer = await getBundledModule(moduleName, resolvedModulePath);
  const {keys, autoDefault} = exportsForModule(resolvedModulePath);
  const exports = keys.filter(key => validJSIdentifier.test(key)).map(key => {
    return `export const ${key} = value.${key};`
  });
  if (autoDefault)
    exports.push('export default value;');
  return `var ${buffer.toString('utf8')}
const value = require('${moduleName}');
${exports.join('\n')}`;
}

function exportsForModule(modulePath: string) {
  const mod = require(modulePath);
  const autoDefault = mod && !mod.__esModule;
  const keys = mod ? Object.keys(mod) : [];
  for (const [filePath, value] of Object.entries(require.cache)) {
    let currentModule: NodeModule|null = value;
    while (currentModule) {
      if (currentModule.filename === modulePath) {
        delete require.cache[filePath];
        break;
      }
      currentModule = currentModule.parent;
    }
  }
  return {
    autoDefault,
    keys,
  };
}
