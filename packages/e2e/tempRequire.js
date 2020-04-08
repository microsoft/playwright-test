// This file should not require anything!

function clearTempRequires() {
  for (const filePath of Object.keys(require.cache)) {
    let module = require.cache[filePath];
    while (module.parent) {
      if (module.parent.filename === __filename) {
        delete require.cache[filePath];
        break;
      }
      module = module.parent;
    }

  }
}

/**
 * @param {string} filePath
 * @return {any}
 */
function tempRequire(filePath) {
  return require(filePath);
}

module.exports = {clearTempRequires, tempRequire};