/**
 * Copyright 2017 Google Inc. All rights reserved.
 * Modifications copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import  colors from 'colors/safe';
import fs from 'fs';
import jpeg from 'jpeg-js';
import path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const extensionToMimeType: { [key: string]: string } = {
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
};

const GoldenComparators: { [key: string]: any } = {
  'image/png': compareImages,
  'image/jpeg': compareImages,
};

function compareImages(actualBuffer: Buffer, expectedBuffer: Buffer, mimeType: string, options = {}): { diff?: object; errorMessage?: string; } | null {
  if (!actualBuffer || !(actualBuffer instanceof Buffer))
    return { errorMessage: 'Actual result should be Buffer.' };

  const actual = mimeType === 'image/png' ? PNG.sync.read(actualBuffer) : jpeg.decode(actualBuffer);
  const expected = mimeType === 'image/png' ? PNG.sync.read(expectedBuffer) : jpeg.decode(expectedBuffer);
  if (expected.width !== actual.width || expected.height !== actual.height) {
    return {
      errorMessage: `Sizes differ; expected image ${expected.width}px X ${expected.height}px, but got ${actual.width}px X ${actual.height}px. `
    };
  }
  const diff = new PNG({width: expected.width, height: expected.height});
  const count = pixelmatch(expected.data, actual.data, diff.data, expected.width, expected.height, { threshold: 0.2, ...options });
  return count > 0 ? { diff: PNG.sync.write(diff) } : null;
}

export function compare(actual: Buffer, name: string, snapshotFile: string, testOutputPath: (name: string) => string, updateSnapshots: boolean, options?: { threshold?: number }): { pass: boolean; message?: string; } {
  if (!fs.existsSync(snapshotFile)) {
    fs.mkdirSync(path.dirname(snapshotFile), { recursive: true });
    fs.writeFileSync(snapshotFile, actual);
    return {
      pass: false,
      message: snapshotFile + ' is missing in golden results, writing actual.'
    };
  }
  const expected = fs.readFileSync(snapshotFile);
  const extension = path.extname(snapshotFile).substring(1);
  const mimeType = extensionToMimeType[extension];
  const comparator = GoldenComparators[mimeType];
  if (!comparator) {
    return {
      pass: false,
      message: 'Failed to find comparator with type ' + mimeType + ': '  + snapshotFile,
    };
  }

  const result = comparator(actual, expected, mimeType, options);
  if (!result)
    return { pass: true };

  if (updateSnapshots) {
    fs.mkdirSync(path.dirname(snapshotFile), { recursive: true });
    fs.writeFileSync(snapshotFile, actual);
    console.log('Updating snapshot at ' + snapshotFile);
    return {
      pass: true,
      message: snapshotFile + ' running with --p-update-snapshots, writing actual.'
    };
  }
  const outputFile = testOutputPath(name);
  const expectedPath = addSuffix(outputFile, '-expected');
  const actualPath = addSuffix(outputFile, '-actual');
  const diffPath = addSuffix(outputFile, '-diff');
  fs.writeFileSync(expectedPath, expected);
  fs.writeFileSync(actualPath, actual);
  if (result.diff)
    fs.writeFileSync(diffPath, result.diff);

  const output = [
    colors.red(`Image comparison failed:`),
  ];
  if (result.errorMessage)
    output.push('    ' + result.errorMessage);
  output.push('');
  output.push(`Expected: ${colors.yellow(expectedPath)}`);
  output.push(`Received: ${colors.yellow(actualPath)}`);
  if (result.diff)
    output.push(`    Diff: ${colors.yellow(diffPath)}`);

  return {
    pass: false,
    message: output.join('\n'),
  };
}

function addSuffix(filePath: string, suffix: string, customExtension?: string): string {
  const dirname = path.dirname(filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  return path.join(dirname, name + suffix + (customExtension || ext));
}
