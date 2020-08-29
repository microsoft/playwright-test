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

const path = require('path');
const {GlobSync} = require('glob');
const projects = GlobSync('./packages/*/jest.config.js')
    .found
    .flatMap(filePath => flattenProjects(require(filePath), path.resolve(__dirname, path.dirname(filePath))));
module.exports = {projects};

function flattenProjects(project, baseDir) {
  if (project.preset) {
    const preset = resolvePreset(project.preset, baseDir);
    delete project.preset;
    for (const [key, value] of Object.entries(preset)) {
      if (key in project)
        continue;
      project[key] = value;
    }
  }
  if (!project.rootDir)
    project.rootDir = baseDir;
  if (!project.displayName)
    project.displayName = path.basename(baseDir);
  const {projects} = project;
  if (!projects)
    return [project];
  delete project.projects;
  return projects.flatMap(overrides => flattenProjects({...project, ...overrides}), baseDir);
}

function resolvePreset(name, baseDir) {
  const presetPath = name.startsWith('.') ? name : path.join(name, 'jest-preset');
  const resolvedPreset = require.resolve(presetPath, {baseDir, extensions: ['.js', '.json']});
  const preset = require(resolvedPreset);
  delete require.cache[resolvedPreset];
  return preset;
}
