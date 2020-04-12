import type {Page, Request} from 'playwright';
import * as url from 'url';
import * as fs from 'fs';
import { transformLocalFile } from './transform';
import * as path from 'path';
import { requireResolve } from './requireResolve';
import { findAndBundleModule } from './loadThirdPartyModule';

const THIRD_PARTY = 'https://third_party/';
const LOCAL_URL = 'https://local_url';
const ROOT_PAGE = filePathToLocalUrl(path.join(__dirname, '..', 'web', 'root.html'));

export async function setupPage(page: Page) {
  page.on('console', message => console.log(message.text()));
  page.on('pageerror', message => console.log(message.stack));
  await page.route('**/*', async (route, request) => {
    if (request.url().startsWith(THIRD_PARTY)) {
      await route.fulfill({
        body: await requestToThirdParty(request),
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
        body: await fs.promises.readFile(localUrlToFilePath(ROOT_PAGE)),
        contentType: 'text/html',
      })
      return;
    }
    const filePath = localUrlToFilePath(request.url());
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
          'Location': filePathToLocalUrl(resolvedPath),
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


function localUrlToFilePath(localUrl: string) {
  const fileURL = 'file://' + url.parse(localUrl).pathname;
  return url.fileURLToPath(fileURL);
}

function filePathToLocalUrl(filePath: string) {
  return LOCAL_URL + url.pathToFileURL(filePath).pathname;
}

async function requestToThirdParty(request: Request) {
  const moduleName = request.url().substring(THIRD_PARTY.length);
  const {referer} = request.headers() as {[key: string]: string};
  return await findAndBundleModule(moduleName, localUrlToFilePath(referer));
}