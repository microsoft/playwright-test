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

import { ChromiumEnv, test, setConfig } from '../../out';

setConfig({
  testDir: __dirname,
  timeout: 30000,
  retries: 1,
});

test.runWith(new ChromiumEnv({ video: 'off', screenshot: 'off' }), { tag: 'off' });
test.runWith(new ChromiumEnv({ video: 'on' }), { tag: 'video-on' });
test.runWith(new ChromiumEnv({ video: 'retain-on-failure' }), { tag: 'video-failure' });
test.runWith(new ChromiumEnv({ video: 'retry-with-video' }), { tag: 'video-retry' });
test.runWith(new ChromiumEnv({ screenshot: 'on' }), { tag: 'screenshot-on' });
test.runWith(new ChromiumEnv({ screenshot: 'only-on-failure' }), { tag: 'screenshot-failure' });
