/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import jestExpect from 'expect';
import path from 'path';
export const expect = jestExpect;
import {getMatchers} from 'expect/build/jestMatchersObject';
import { testById, Test } from './test';
import fs from 'fs';

expect.extend({toMatchSnapshot});
let snapshotDir = path.join(process.cwd(), '__snapshots__');
let updateSnapshot: 'new'|'all'|'none' = 'new';

function toMatchSnapshot(this: {isNot: boolean}, recieved: any, name?: string) {
  const {isNot} = this;
  if (isNot)
    throw new Error(`Cannot use 'not' with toMatchSnapshot`);
  const {matcher, extension, load, save} = getMatchType(recieved);
  if (!name) {
    const test = findTestInCallStack();
    if (!test)
      throw new Error(`Could not auto detect a snapshot name. Must specify a name.`);
    name = test.fullName().replace(/\s+/g, '-').toLowerCase() + '.' + extension;
  }
  const goldenPath = path.join(snapshotDir, name);
  const exists = fs.existsSync(goldenPath);
  if (updateSnapshot === 'all' || (updateSnapshot === 'new' && !exists)) {
    fs.mkdirSync(path.dirname(goldenPath), {recursive: true});
    fs.writeFileSync(goldenPath, save(recieved));
    return {
      pass: true,
    };
  }
  if (!exists)
    throw new Error(`Could not find snapshot at ${goldenPath}.`);
  const expected = load(fs.readFileSync(goldenPath));
  return matcher.call(this, recieved, expected);
}

function getMatchType(recieved: any) {
  if (typeof recieved === 'string') {
    return {
      matcher: getMatchers().toBe,
      extension: 'txt',
      load: (buffer: Buffer) => buffer.toString('utf8'),
      save: (value: string) => Buffer.from(value, 'utf8'),
    };
  }

  return {
    matcher: getMatchers().toEqual,
    extension: 'json',
    load: (buffer: Buffer) => JSON.parse(buffer.toString('utf8')),
    save: (value: any) => Buffer.from(JSON.stringify(value), 'utf8'),
  };
}

function findTestInCallStack(): Test | null {
  const dummy = {stack: ''};
  Error.captureStackTrace(dummy);
  const result = / Test #([0-9]*):/g.exec(dummy.stack);
  return result && testById[parseInt(result[1], 10)];
}

export function setSnapshotOptions(options: {
  snapshotDir?: string,
  updateSnapshot?: 'new'|'all'|'none',
} = {}) {
  if (options.snapshotDir)
    snapshotDir = options.snapshotDir;
  if (options.updateSnapshot)
    updateSnapshot = options.updateSnapshot;
}
