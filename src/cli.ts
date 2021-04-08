/**
 * Copyright Microsoft Corporation. All rights reserved.
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

import * as path from 'path';
import * as fs from 'fs';
import { project as tsProject } from './tsProject';
import { project as jsProject } from './jsProject';

if (process.argv.length < 3 || !['example', 'example-js', 'example-ts'].includes(process.argv[2])) {
  console.error(`Usage:`);
  console.error(`npx playwright-test example <test-directory>`);
  console.error(`npx playwright-test example-ts <test-directory>`);
  process.exit(1);
}

const testDir = path.resolve(process.cwd(), process.argv[3]);
if (fs.existsSync(testDir) && fs.readdirSync(testDir).length) {
  console.error(`ERROR: ${testDir} is not empty`);
  process.exit(1);
}

console.log(`Creating test example in ${testDir}`);
const project = process.argv[2] === 'example-ts' ? tsProject : jsProject;
for (const [filePath, content] of Object.entries(project.files)) {
  const platformPath = path.join(...filePath.split('/'));
  console.log(`  - writing ${platformPath}`);
  const fullPath = path.join(testDir, platformPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}
console.log('');
console.log(`Run tests:`);
console.log(`  npx folio --config=${path.join(process.argv[3], project.configFile)}`);
console.log('');
console.log(`Get help:`);
console.log(`  npx folio --help`);
process.exit(0);
