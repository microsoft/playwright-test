class Suite {
  name: string;
  parentSuite: Suite;
  children: (Suite|Test)[] = [];
  private _tests: Test[] = [];
  private _callback: () => void | Promise<void>;
  _beforeEaches: ((state: State) => void|Promise<void>)[] = [];

  /**
   * @param {string} name
   * @param {Suite|null=} parent
   * @param {() => void|Promise<void>|null=} callback
   */
  constructor(name: string, parent: (Suite | null) | undefined = null, callback: (() => void | Promise<void> | null) | undefined = null) {
    this.name = name;
    this.parentSuite = parent;
    this._callback = callback;

    if (parent)
      parent.children.push(this);
  }

  fullName() {
    return this.parentSuite ? (this.parentSuite.fullName() + ' ' + this.name).trim() : this.name;
  }

  async runTestsSerially() {
    const tests = await this.tests();
    /** @type {TestResult[]} */
    const results: TestResult[] = [];
    for (const test of tests)
      results.push(await test.run());
    return results;
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
  _callback: (state: any) => void | Promise<void>;
  name: string;
  suite: Suite;
  /**
   * @param {string} name
   * @param {(state: State) => void|Promise<void>} callback
   */
  constructor(name: string, callback: (state: State) => void | Promise<void>) {
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
  async run(state: State | undefined = {}) {
    /** @type {TestResult} */
    const result: TestResult = {
      success: true,
      name: this.fullName()
    };
    let suite = this.suite;
    while (suite) {
      for (const beforeEach of suite._beforeEaches)
        await beforeEach(state);
      suite = suite.parentSuite;
    }
    try {
      await this._callback(state);
    } catch (e) {
      result.success = false;
      result.error = e;
    }
    return result;
  }
}

type State = {[key: string]: any};

type TestResult = {
  name: string,
  success: boolean,
  error?: any,
};

export function describe(name: string, callback: () => void | Promise<void>);
export function describe(callback: () => void | Promise<void>);
export function describe(callbackOrName: string|(() => void|Promise<void>), callback?: () => void | Promise<void>) {
  const name = callback ? callbackOrName as string : '';
  if (!callback)
    callback = callbackOrName as () => void|Promise<void>;
  const suite = new Suite(name, currentSuite, callback);
  return suite;
}

/**
 * @param {string} name
 * @param {(state: State) => void|Promise<void>} callback
 */
export function it(name: string, callback: (state: State) => void | Promise<void>) {
  const test = new Test(name, callback);
  return test;
}

/**
 * @param {(state: State) => void|Promise<void>} callback
 */
export function beforeEach(callback: (state: State) => void | Promise<void>) {
  currentSuite._beforeEaches.push(callback);
}

const rootSuite = new Suite('', null);
let currentSuite = rootSuite;
