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

const { EventEmitter } = require('events');
const TestExpectation = {
  Ok: 'ok',
  Fail: 'fail',
};

/**
 * @param {function} callback
 * @param {string} name
 */
function createHook(callback, name) {
  return { name, body: callback };
}

class Test {
  /**
     *
     * @param {Suite} suite
     * @param {string} name
     * @param {function} callback
     */
  constructor(suite, name, callback) {
    this._suite = suite;
    this._name = name;
    this._fullName = (suite.fullName() + ' ' + name).trim();
    this._skipped = false;
    this._focused = false;
    this._expectation = TestExpectation.Ok;
    this._body = callback;
    this._repeat = 1;
  }

  suite() {
    return this._suite;
  }

  name() {
    return this._name;
  }

  fullName() {
    return this._fullName;
  }

  body() {
    return this._body;
  }

  ancestorTitles() {
    const ancestorTitles = [];
    /** @type {Suite|null} */
    let suite = this._suite;
    while (suite) {
      ancestorTitles.push(suite.name());
      suite = suite.parentSuite();
    }
    return ancestorTitles;
  }

  skipped() {
    return this._skipped;
  }

  /**
     * @param {boolean} skipped
     */
  setSkipped(skipped) {
    this._skipped = skipped;
    return this;
  }

  focused() {
    return this._focused;
  }

  /**
     * @param {boolean} focused
     */
  setFocused(focused) {
    this._focused = focused;
    return this;
  }

  expectation() {
    return this._expectation;
  }

  /**
     * @param {string} expectation
     */
  setExpectation(expectation) {
    this._expectation = expectation;
    return this;
  }

  repeat() {
    return this._repeat;
  }

  /**
     * @param {number} repeat
     */
  setRepeat(repeat) {
    this._repeat = repeat;
    return this;
  }
}

class Suite {
  /**
     * @param {Suite|null} parentSuite
     * @param {string} name
     */
  constructor(parentSuite, name) {
    this._parentSuite = parentSuite;
    this._name = name;
    /** @type {string} */
    this._fullName = (parentSuite ? parentSuite.fullName() + ' ' + name : name).trim();
    /** @type {{name: string, body: function}[]} */
    this._hooks = [];
    this._skipped = false;
    this._focused = false;
    this._expectation = TestExpectation.Ok;
    this._repeat = 1;
  }

  skipped() {
    return this._skipped;
  }

  /**
     * @param {boolean} skipped
     */
  setSkipped(skipped) {
    this._skipped = skipped;
    return this;
  }

  focused() {
    return this._focused;
  }

  /**
     * @param {boolean} focused
     */
  setFocused(focused) {
    this._focused = focused;
    return this;
  }

  expectation() {
    return this._expectation;
  }

  /**
     * @param {string} expectation
     */
  setExpectation(expectation) {
    this._expectation = expectation;
    return this;
  }

  repeat() {
    return this._repeat;
  }

  /**
     * @param {number} repeat
     */
  setRepeat(repeat) {
    this._repeat = repeat;
    return this;
  }

  parentSuite() {
    return this._parentSuite;
  }

  name() {
    return this._name;
  }

  fullName() {
    return this._fullName;
  }

  /**
     * @param {function} callback
     */
  beforeEach(callback) {
    this._hooks.push(createHook(callback, 'beforeEach'));
  }

  /**
     * @param {function} callback
     */
  afterEach(callback) {
    this._hooks.push(createHook(callback, 'afterEach'));
  }

  /**
     * @param {function} callback
     */
  beforeAll(callback) {
    this._hooks.push(createHook(callback, 'beforeAll'));
  }

  /**
     * @param {function} callback
     */
  afterAll(callback) {
    this._hooks.push(createHook(callback, 'afterAll'));
  }

  /**
     * @param {string} name
     */
  hooks(name) {
    return this._hooks.filter(hook => !name || hook.name === name);
  }
}

class TestRunner extends EventEmitter {
  constructor() {
    super();
    this._rootSuite = new Suite(null, '');
    this._currentSuite = this._rootSuite;
    /** @type {Test[]} */
    this._tests = [];
    /** @type {Suite[]} */
    this._suites = [];
    /** @type {Map<string|symbol|number, function>} */
    this._suiteModifiers = new Map();
    /** @type {Map<string|symbol|number, function>} */
    this._testModifiers = new Map();
    this.clear();
  }

  api() {
    return {
      /** @type {(callback: function) => void} */
      beforeAll: callback => this._currentSuite.beforeAll(callback),
      /** @type {(callback: function) => void} */
      beforeEach: callback => this._currentSuite.beforeEach(callback),
      /** @type {(callback: function) => void} */
      afterAll: callback => this._currentSuite.afterAll(callback),
      /** @type {(callback: function) => void} */
      afterEach: callback => this._currentSuite.afterEach(callback),
      fdescribe: this._suiteBuilder(s => s.setFocused(true)),
      xdescribe: this._suiteBuilder(s => s.setSkipped(true)),
      fit: this._testBuilder(t => t.setFocused(true)),
      xit: this._testBuilder(t => t.setSkipped(true)),
      it: this._testBuilder(),
      describe: this._suiteBuilder(),
    };
  }

  /**
     * @param {(suite: Suite) => void} modifySuite
     */
  _suiteBuilder(modifySuite = () => void 0) {
    /**
         * @this {TestRunner}
         * @param {string} name
         * @param {() => void} callback
         */
    function buildSuite(name, callback) {
      const suite = new Suite(this._currentSuite, name);
      modifySuite(suite);
      const prevSuite = this._currentSuite;
      this._currentSuite = suite;
      callback();
      this._suites.push(suite);
      this._currentSuite = prevSuite;
      return suite;
    }

    return new Proxy(buildSuite.bind(this), {
      get: (obj, prop) => {
        const modifier = this._suiteModifiers.get(prop);
        if (modifier) {
          return (/** @type {any[]} */...args) => this._suiteBuilder(suite => {
            modifySuite(suite);
            modifier(suite, ...args);
          });
        }
        return /** @type {any} */ (obj)[prop];
      },
    });
  }

  /**
     * @param {(test: Test) => void} modifyTest
     */
  _testBuilder(modifyTest = () => void 0) {
    /**
         * @this {TestRunner}
         * @param {string} name
         * @param {() => void} callback
         */
    function buildTest(name, callback) {
      const test = new Test(this._currentSuite, name, callback);
      modifyTest(test);
      this._tests.push(test);
      return test;
    }
    return new Proxy(buildTest.bind(this), {
      get: (obj, prop) => {
        const modifier = this._testModifiers.get(prop);
        if (modifier) {
          return (/** @type {any[]} */...args) => this._testBuilder(test => {
            modifyTest(test);
            modifier(test, ...args);
          });
        }
        return /** @type {any} */ (obj)[prop];
      },
    });
  }

  /**
     * @param {string} name
     * @param {function} callback
     */
  testModifier(name, callback) {
    this._testModifiers.set(name, callback);
  }

  /**
     * @param {string} name
     * @param {function} callback
     */
  suiteModifier(name, callback) {
    this._suiteModifiers.set(name, callback);
  }

  hasFocusedTestsOrSuites() {
    return this._tests.some(test => test.focused()) || this._suites.some(suite => suite.focused());
  }

  /**
     * @param {RegExp} fullNameRegex
     */
  focusMatchingTests(fullNameRegex) {
    for (const test of this._tests) {
      if (fullNameRegex.test(test.fullName()))
        test.setFocused(true);
    }
  }

  tests() {
    return this._tests.slice();
  }

  suites() {
    return this._suites.slice();
  }

  clear() {
    this._rootSuite = new Suite(null, '');
    this._currentSuite = this._rootSuite;
    this._tests = [];
    this._suites = [];
    this._suiteModifiers.clear();
    this._testModifiers.clear();
  }
}


module.exports = {
  Test,
  testRunner: new TestRunner(),
};
