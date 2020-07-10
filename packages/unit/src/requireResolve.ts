// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
import fs from 'fs';
import path from 'path';

const CHAR_FORWARD_SLASH = '/'.charCodeAt(0);
const trailingSlashRegex = /(?:^|\/)\.?\.$/;
export async function requireResolve(request: string): Promise<string> {
  const exts = ['.js', '.json', '.node', '.jsx', '.ts', '.tsx'];
  let trailingSlash = request.length > 0 &&
    request.charCodeAt(request.length - 1) === CHAR_FORWARD_SLASH;
  if (!trailingSlash)
    trailingSlash = trailingSlashRegex.test(request);


  const rc = await fs.promises.stat(request).catch(e => null);
  if (!trailingSlash) {
    if (rc && rc.isFile())  // File.
      return await fs.promises.realpath(request);

    // Try it with each of the extensions
    const newExtensionFile = await tryExtensions(request, exts);
    if (newExtensionFile)
      return newExtensionFile;
  }
  if (rc && rc.isDirectory()) {
    const packageFile = await tryPackage(request, exts);
    if (packageFile)
      return packageFile;
  }

  throw new Error('Could not resolve file: ' + request);
}
// Given a path, check if the file exists with any of the set extensions
async function tryExtensions(p: string, exts: string[]) {
  for (let i = 0; i < exts.length; i++) {
    const filename = await tryFile(p + exts[i]);

    if (filename)
      return filename;
  }
  return null;
}
async function tryFile(requestPath: string) {
  const rc = await fs.promises.stat(requestPath).catch(e => null);
  if (!rc || !rc.isFile()) return;
  return await fs.promises.realpath(requestPath);
}

async function tryPackage(requestPath: string, exts: string[]) {
  const pkg = await readPackageMain(requestPath);

  if (!pkg)
    return tryExtensions(path.resolve(requestPath, 'index'), exts);

  const filename = path.resolve(requestPath, pkg);
  let actual = await tryFile(filename) ||
    await tryExtensions(filename, exts) ||
    await tryExtensions(path.resolve(filename, 'index'), exts);
  if (actual === null) {
    actual = await tryExtensions(path.resolve(requestPath, 'index'), exts);
    if (!actual) {
      throw new Error(
          `Cannot find module '${filename}'. ` +
        'Please verify that the package.json has a valid "main" entry'
      );
    }
  }
  return actual;
}

async function readPackageMain(requestPath: string) {
  const jsonPath = path.resolve(requestPath, 'package.json');

  const json = await fs.promises.readFile(path.toNamespacedPath(jsonPath)).catch(() => null);
  if (!json)
    return;

  try {
    const {main} = json.toJSON() as {main?: string};
    return main;
  } catch (e) {
    e.path = jsonPath;
    e.message = 'Error parsing ' + jsonPath + ': ' + e.message;
    throw e;
  }
}
