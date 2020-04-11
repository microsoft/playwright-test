type UserCallback<T = void> = (state: T) => (void | Promise<void>);
class Suite {
  name: string;
  parentSuite: Suite | null;
  children: (Suite|Test)[] = [];
  private _tests: Test[] = [];
  private _callback: UserCallback | null;
  _beforeEaches: UserCallback<State>[] = [];

  constructor(name: string, parent: Suite | null = null, callback: UserCallback | null = null) {
    this.name = name;
    this.parentSuite = parent;
    this._callback = callback;

    if (parent)
      parent.children.push(this);
  }

  fullName() : string {
    return this.parentSuite ? (this.parentSuite.fullName() + ' ' + this.name).trim() : this.name;
  }

  ancestorTitles(): string[] {
    if (!this.parentSuite) {
      if (!this.name)
        return [];
      return [this.name];
    }
    if (!this.name)
      return this.parentSuite.ancestorTitles();
    return [...this.parentSuite.ancestorTitles(), this.name];
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
   * @param {(state: State) => UserCallback} callback
   */
  constructor(name: string, callback: (state: State) => void | Promise<void>) {
    this._callback = callback;
    this.name = name;
    this.suite = currentSuite;
    currentSuite.children.push(this);
  }

  ancestorTitles() {
    return [...this.suite.ancestorTitles(), this.name];
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
    let suite : Suite | null = this.suite;
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

export function describe(name: string, callback: UserCallback) : Suite;
export function describe(callback: UserCallback) : Suite;
export function describe(callbackOrName: string|UserCallback, callback?: UserCallback) {
  const name = callback ? callbackOrName as string : '';
  if (!callback)
    callback = callbackOrName as UserCallback;
  const suite = new Suite(name, currentSuite, callback);
  return suite;
}

export function it(name: string, callback: UserCallback<State>) {
  const test = new Test(name, callback);
  return test;
}

export type It<T> = (name: string, callback: UserCallback<T & State>) => Test;
export type BeforeOrAfter<T> = (callback: UserCallback<T & State>) => Test;

export function beforeEach(callback: (state: State) => void | Promise<void>) {
  currentSuite._beforeEaches.push(callback);
}

const rootSuite = new Suite('', null);
let currentSuite = rootSuite;

export type {Test};
