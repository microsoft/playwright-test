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
