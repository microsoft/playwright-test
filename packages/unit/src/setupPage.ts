import type {Page, Request} from 'playwright';
import url from 'url';
import fs from 'fs';
import { transformLocalFile } from './transform';
import path from 'path';
import { requireResolve } from './requireResolve';
import { findAndBundleModule } from './loadThirdPartyModule';
import { installSuperpowers } from 'playwright-superpowers';

const THIRD_PARTY = 'https://third_party';
const LOCAL_URL = 'https://local_url';
const WEB_FOLDER = path.join(__dirname, '..', 'web');
const ROOT_PAGE = LOCAL_URL + filePathToUrlPathname(path.join(WEB_FOLDER, 'root.html'));

export async function setupPage(page: Page) {
  page.on('console', message => console.log(message.text()));
  page.on('pageerror', message => console.log(message.stack));
  await installSuperpowers(page);
  await page.route('**/*', async (route, request) => {
    if (request.url().startsWith(THIRD_PARTY + '/')) {
      const searchParams = new url.URLSearchParams(url.parse(request.url()).search || '?');
      const moduleName = searchParams.get('name');
      const parentFile = searchParams.get('from') || WEB_FOLDER;
      if (moduleName) {
        const resolvedModulePath = require.resolve(moduleName, {paths: [parentFile]});
        await route.fulfill({
          status: 301,
          headers: {
            'Access-Control-Allow-Origin': 'https://local_url',
            'Location': THIRD_PARTY + filePathToUrlPathname(resolvedModulePath),
          }
        });
        return;
      }
      await route.fulfill({
        body: await findAndBundleModule(extractFilePathFromUrl(request.url())),
        contentType: 'application/javascript',
        headers: {
          'Access-Control-Allow-Origin': 'https://local_url',
        }
      });

      return;
    }
    if (!request.url().startsWith(LOCAL_URL + '/')) {
      await route.continue();
      return;
    }
    if (request.url() === ROOT_PAGE) {
      await route.fulfill({
        body: await fs.promises.readFile(extractFilePathFromUrl(ROOT_PAGE)),
        contentType: 'text/html',
      })
      return;
    }
    const filePath = extractFilePathFromUrl(request.url());
    const resolvedPath = await requireResolve(filePath);
    if (!resolvedPath) {
      await route.fulfill({
        status: 404,
        contentType: 'text/html',
        body: 'not found',
      });
    }
    if (resolvedPath !== filePath) {
      await route.fulfill({
        status: 301,
        headers: {
          'Location': LOCAL_URL + filePathToUrlPathname(resolvedPath),
        }
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: await transformLocalFile(resolvedPath),
    });
  });
  await page.goto(ROOT_PAGE);
}


function extractFilePathFromUrl(localUrl: string) {
  const fileURL = 'file://' + url.parse(localUrl).pathname;
  return url.fileURLToPath(fileURL);
}

function filePathToUrlPathname(filePath: string) {
  return url.pathToFileURL(filePath).pathname;
}
