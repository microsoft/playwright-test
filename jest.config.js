const {GlobSync} = require('glob');
const projects = GlobSync('./packages/*/jest.config.js').found.map(filePath => flattenProjects(require(filePath)));
module.exports = {projects};

function flattenProjects(project) {
  const {projects} = project;
  if (!projects)
    return project;
  delete project.projects;
  return projects.map(overrides => flattenProjects({...project, ...overrides}));
}
