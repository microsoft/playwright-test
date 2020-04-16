import browserify from 'browserify';
import { promisify } from 'util';
import validJSIdentifier from './validJSIdentifier';
import MD5 from 'md5.js';
import fs from 'fs';
import path from 'path';
import {tmpdir} from 'os';
const {readFile, stat, mkdir, writeFile} = fs.promises;

const playwrightRunnerCacheVersion = 0;

async function getBundledModule(resolvedModulePath: string) {
  const bundle = new browserify();
  const files: string[] = [];
  bundle.on('file', file => files.push(file));
  bundle.on('package', pkg => files.push(path.join(pkg.__dirname, 'package.json')));
  bundle.require(resolvedModulePath, {expose: resolvedModulePath});
  const buffer = await promisify(bundle.bundle.bind(bundle))();
  const {keys, autoDefault} = exportsForModule(resolvedModulePath);
  const exports = keys.filter(key => validJSIdentifier.test(key)).map(key => {
    return `export const ${key} = value.${key};`
  });
  if (autoDefault)
    exports.push('export default value;');
  const code = `var ${buffer.toString('utf8')}
const value = require('${resolvedModulePath}');
${exports.join('\n')}`;

  return {code, files};
}

function hashForFilePath(filePath: string) {
  return new MD5().update(String(playwrightRunnerCacheVersion) + filePath).digest('hex');
}
let _cachePromise : Promise<string>;
async function ensureCacheDir() {
  if (!_cachePromise) {
    _cachePromise = new Promise(async resolve => {
      const cacheDir = path.join(tmpdir(), 'playwright-runner-cache');
      await mkdir(cacheDir).catch(e => void 0);
      resolve(cacheDir);  
    });
  }
  return _cachePromise;
}

async function attemptToGetCachedBundledModule(hashModulePath: string): Promise<string|null> {
  const cacheDir = await ensureCacheDir();
  const jsonPath = path.join(cacheDir, hashModulePath + '.json');
  const jsonData = await readFile(jsonPath, 'utf8').catch(() => null);
  if (!jsonData)
    return null;
  const files: [string, number][] = JSON.parse(jsonData);
  let allFilesGood = true;
  await Promise.all(files.map(async ([file, time]) => {
    const {mtimeMs} = await stat(file).catch(() => ({mtimeMs: -1}));
    if (mtimeMs !== time)
      allFilesGood = false;
  }));
  if (!allFilesGood)
    return null;

  return readFile(path.join(cacheDir, hashModulePath + '.js'), 'utf8');
}

export async function findAndBundleModule(resolvedModulePath: string) {
  const hashModulePath = hashForFilePath(resolvedModulePath);
  const cachedBundle = await attemptToGetCachedBundledModule(hashModulePath);
  if (cachedBundle)
    return cachedBundle;
  const {code, files} = await getBundledModule(resolvedModulePath);
  const cacheDir = await ensureCacheDir();
  const cacheJSON = await Promise.all(files.map(async file => {
    const {mtimeMs} = await stat(file);
    return [file, mtimeMs];
  }));
  await Promise.all([
    writeFile(path.join(cacheDir, hashModulePath + '.json'), JSON.stringify(cacheJSON), 'utf8'),
    writeFile(path.join(cacheDir, hashModulePath + '.js'), code, 'utf8'),
  ]);

  return code;
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
