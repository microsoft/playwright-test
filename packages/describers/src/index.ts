type UserCallback<T = void> = (state: T) => (void | Promise<void>);
type State = {[key: string]: any};

export type TestResult = {
  name: string,
  success: boolean,
  error?: any,
};

const TimeoutError = new Error('Timeout');
const TerminatedError = new Error('Terminated');
const NoError = Symbol('NoError');

function runUserCallback(callback: (...args: any[]) => any, timeout: number, args: any[]) {
  let terminateCallback: (error: Error) => void;
  let timeoutId: any;
  const promise: Promise<any> = Promise.race([
    Promise.resolve().then(callback.bind(null, ...args)).then(() => NoError).catch((e: any) => e),
    new Promise(resolve => {
      timeoutId = timeout ? setTimeout(resolve.bind(null, TimeoutError), timeout) : undefined;
    }),
    new Promise(resolve => terminateCallback = resolve),
  ]).catch(e => e).finally(() => timeoutId && clearTimeout(timeoutId));
  const terminate = () => terminateCallback(TerminatedError);
  return { promise, terminate };
}

class Suite {
  name: string;
  parentSuite: Suite | null;
  children: (Suite|Test)[] = [];
  _tests: Test[] = [];
  _callback: UserCallback | null;
  _beforeEaches: UserCallback<State>[] = [];
  _afterEaches: UserCallback<State>[] = [];

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

  async runTestsSerially(state: State = {}, timeout: number = 0, hookTimeout = timeout) {
    const tests = await this.tests();
    const results: TestResult[] = [];
    for (const test of tests)
      results.push(await test.run(state, timeout, hookTimeout));
    return results;
  }

  async tests(timeout: number = 0) {
    if (this._callback) {
      const callback = this._callback;
      this._callback = null;
      const previousSuite = currentSuite;
      currentSuite = this;
      const { promise } = runUserCallback(callback, timeout, []);
      const error = await promise;
      if (error !== NoError)
        throw error;
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
  _callback: UserCallback<State>;
  name: string;
  suite: Suite;

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

  async run(state: State = {}, timeout = 0, hookTimeout = timeout) {
    const result: TestResult = {
      success: true,
      name: this.fullName()
    };

    const suites: Suite[] = [];
    for (let suite : Suite | null = this.suite; suite; suite = suite.parentSuite)
      suites.push(suite);

    for (const suite of suites) {
      for (const beforeEach of suite._beforeEaches)
        await this._runHook(result, beforeEach, state, hookTimeout);
    }

    if (result.success) {
      const { promise } = runUserCallback(this._callback, timeout, [state]);
      const error = await promise;
      if (error !== NoError && result.success) {
        result.success = false;
        if (error === TimeoutError)
          result.error = `timed out while running test`;
        else if (error === TerminatedError)
          result.error = `terminated while running test`;
        else
          result.error = error;
      }
    }

    suites.reverse();
    for (const suite of suites) {
      for (const afterEach of suite._afterEaches)
        await this._runHook(result, afterEach, state, hookTimeout);
    }

    return result;
  }

  async _runHook(result: TestResult, hook: UserCallback<State>, state: State, hookTimeout: number) {
    const { promise } = runUserCallback(hook, hookTimeout, [state]);
    const error = await promise;
    if (error !== NoError && result.success) {
      result.success = false;
      if (error === TimeoutError)
        result.error = `timed out while running hook`;
      else if (error === TerminatedError)
        result.error = '';  // Do not report hook termination details - it's just noise.
      else
        result.error = error;
    }
    return !error;
  }
}

export function describe(name: string, callback: UserCallback) : void;
export function describe(callback: UserCallback) : void;
export function describe(callbackOrName: string|UserCallback, callback?: UserCallback) {
  createSuite(callbackOrName as any, callback as any);
}

export function createSuite(name: string, callback: UserCallback) : Suite;
export function createSuite(callback: UserCallback) : Suite;
export function createSuite(callbackOrName: string|UserCallback, callback?: UserCallback) : Suite {
  const name = callback ? callbackOrName as string : '';
  if (!callback)
    callback = callbackOrName as UserCallback;
  return new Suite(name, currentSuite, callback);
}

export function it(name: string, callback: UserCallback<State>) {
  new Test(name, callback);
}

export function createTest(name: string, callback: UserCallback<State>) {
  return new Test(name, callback);
}

export type It<T> = (name: string, callback: UserCallback<T & State>) => void;
export type BeforeOrAfter<T> = (callback: UserCallback<T & State>) => void;

export function beforeEach(callback: (state: State) => void | Promise<void>) {
  currentSuite._beforeEaches.push(callback);
}

export function afterEach(callback: (state: State) => void | Promise<void>) {
  currentSuite._afterEaches.push(callback);
}

const rootSuite = new Suite('', null);
let currentSuite = rootSuite;

export type {Test};
