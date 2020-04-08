class Suite {
  /**
   * @param {string} name
   * @param {Suite|null=} parent
   * @param {() => void|Promise<void>|null=} callback
   */
  constructor(name, parent = null, callback = null) {
    this.name = name;
    this.parentSuite = parent;
    /** @type {(Suite|Test)[]} */
    this.children = [];
    /** @type {Test[]} */
    this._tests = [];
    this._callback = callback;

    if (parent)
      parent.children.push(this);
  }

  fullName() {
    return this.parentSuite ? (this.parentSuite.fullName() + ' ' + this.name).trim() : this.name;
  }

  async tests() {
    if (this._callback) {
      const callback = this._callback;
      this._callback = null;
      const previousSuite = currentSuite;
      currentSuite = this;
      await callback();
      currentSuite = previousSuite;
      for (const testOrSuite of this.children) {
        if (testOrSuite instanceof Test)
          this._tests.push(testOrSuite);
        else
          this._tests.push(...await testOrSuite.tests());
      }
    }
    return this._tests;
  }
}

class Test {
  /**
   * @param {string} name
   * @param {(state: State) => void|Promise<void>} callback
   */
  constructor(name, callback) {
    this._callback = callback;
    this.name = name;
    this.suite = currentSuite;
    currentSuite.children.push(this);
  }

  fullName() {
    return (this.suite.fullName() + ' ' + this.name).trim();
  }

  /**
   * @param {State=} state
   */
  async run(state = {}) {
    const result = {
      success: true,
      error: undefined
    };
    try {
      await this._callback(state);
    } catch (e) {
      result.success = false;
      result.error = e;
    }
    return result;
  }
}

/**
 * @typedef {Object<string, any>} State
 */

/**
 * @param {string} name
 * @param {() => void|Promise<void>} callback
 */
function describe(name, callback) {
  const suite = new Suite(name, currentSuite, callback);
  return suite;
}

/**
 * @param {string} name
 * @param {(state: State) => void|Promise<void>} callback
 */
function it(name, callback) {
  const test = new Test(name, callback);
  return test;

}
const rootSuite = new Suite('', null);
let currentSuite = rootSuite;

module.exports = {describe, it, rootSuite};
