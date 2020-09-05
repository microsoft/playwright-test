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

declare const matrix: (m: any) => void;

matrix({
  'browserName': process.env.BROWSER ? [process.env.BROWSER] : ['chromium', 'webkit'],
  'device': process.env.DEVICE ? [process.env.DEVICE] : ['iPhone 11 Pro Max', 'Pixel 2 XL', {
    'userAgent': 'Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-N900T Build/JSS15J) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    'viewport': {
      'width': 360,
      'height': 640
    },
    'deviceScaleFactor': 3,
    'isMobile': true,
    'hasTouch': true
  }],
});

