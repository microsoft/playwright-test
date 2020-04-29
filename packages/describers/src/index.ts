type UserCallback<T = void> = (state: T) => (void | Promise<void>);
type State = {[key: string]: any};

export type TestRun = {
  test: Test,
  status: 'pass'|'fail'|'skip',
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
  _beforeAlls: UserCallback<State>[] = [];
  _afterAlls: UserCallback<State>[] = [];
  focused = false;
  skipped = false;

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

  async runTestsSerially(timeout: number = 0, hookTimeout = timeout) {
    const tests = await this.tests(hookTimeout);
    const wasFocused = this.focused;
    const results: TestRun[] = [];
    const worker = new TestWorker();
    this.focused = true;
    for (const test of tests)
      results.push(await worker.run(test, timeout, hookTimeout));
    this.focused = wasFocused;
    await worker.shutdown();
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
          this._tests.push(...await testOrSuite.tests(timeout));
      }
    }
    return this._tests;
  }

  _hasFocusedDescendant(): boolean {
    return this.children.some(child => {
      return child.focused || (child instanceof Suite && child._hasFocusedDescendant());
    });
  }
}

class Test {
  _callback: UserCallback<State>;
  name: string;
  suite: Suite;
  focused = false;
  skipped = false;

  constructor(name: string, callback: UserCallback<State>) {
    this._callback = callback;
    this.name = name;
    this.suite = currentSuite;
    currentSuite.children.push(this);
  }

  shouldRun() {
    if (this.skipped)
      return false;
    if (this.focused)
      return true;
    let suite: Suite|null = this.suite;
    while (suite) {
      if (suite.skipped)
        return false;
      suite = suite.parentSuite;
    }
    suite = this.suite;
    while (suite.parentSuite) {
      if (suite.focused)
        break;
      suite = suite.parentSuite;
    }
    if (suite._hasFocusedDescendant())
      return false;
    return true;
  }

  ancestorTitles() {
    return [...this.suite.ancestorTitles(), this.name];
  }

  fullName() {
    return (this.suite.fullName() + ' ' + this.name).trim();
  }

  async runInIsolation(timeout: number = 0, hookTimeout = timeout): Promise<TestRun> {
    const worker = new TestWorker();
    const result = await worker.run(this, timeout, hookTimeout);
    await worker.shutdown();
    return result;
  }
}

export class TestWorker {
  private _suiteStack: Suite[] = [];
  state: State;

  constructor(state: State = {}) {
    this.state = state;
  }

  async run(test: Test, timeout: number = 0, hookTimeout = timeout): Promise<TestRun> {
    if (!test.shouldRun())
      return {test, status: 'skip'};
    const run: TestRun = {
      test,
      status: 'pass',
    };

    const suiteStack: Suite[] = [];
    for (let suite: Suite | null = test.suite; suite; suite = suite.parentSuite)
      suiteStack.push(suite);
    suiteStack.reverse();

    let common = 0;
    while (common < suiteStack.length && this._suiteStack[common] === suiteStack[common])
      common++;

    while (this._suiteStack.length > common) {
      const suite = this._suiteStack.pop()!;
      for (const afterAll of suite._afterAlls) {
        if (!await this._runHook(run, afterAll, hookTimeout))
          return run;
      }
    }
    while (this._suiteStack.length < suiteStack.length) {
      const suite = suiteStack[this._suiteStack.length];
      this._suiteStack.push(suite);
      for (const beforeAll of suite._beforeAlls) {
        if (!await this._runHook(run, beforeAll, hookTimeout))
          return run;
      }
    }

    // From this point till the end, we have to run all hooks
    // no matter what happens.

    for (const suite of this._suiteStack) {
      for (const beforeEach of suite._beforeEaches)
        await this._runHook(run, beforeEach, hookTimeout);
    }

    if (run.status === 'pass') {
      const { promise } = runUserCallback(test._callback, timeout, [this.state]);
      const error = await promise;
      if (error !== NoError && run.status === 'pass') {
        run.status = 'fail';
        if (error === TimeoutError)
          run.error = `timed out while running test`;
        else if (error === TerminatedError)
          run.error = `terminated while running test`;
        else
          run.error = error;
      }
    }

    for (const suite of this._suiteStack.slice().reverse()) {
      for (const afterEach of suite._afterEaches)
        await this._runHook(run, afterEach, hookTimeout);
    }

    return run;
  }

  async shutdown(hookTimeout: number = 0) {
    while (this._suiteStack.length > 0) {
      const suite = this._suiteStack.pop()!;
      for (const afterAll of suite._afterAlls)
        await this._runHook(null, afterAll, hookTimeout);
    }
  }

  private async _runHook(run: TestRun | null, hook: UserCallback<State>, hookTimeout: number) {
    const { promise } = runUserCallback(hook, hookTimeout, [this.state]);
    const error = await promise;
    if (error === NoError)
      return true;
    if (run && run.status === 'pass') {
      run.status = 'fail';
      if (error === TimeoutError)
        run.error = `timed out while running hook`;
      else if (error === TerminatedError)
        run.error = '';  // Do not report hook termination details - it's just noise.
      else
        run.error = error;
    }
    return false;
  }
}

type Describe<ReturnValue=void> = {
  (name: string, callback: UserCallback): ReturnValue;
  (callback: UserCallback) : ReturnValue;
}

export const describe: Describe & {only: Describe} = (callbackOrName: string|UserCallback, callback?: UserCallback) => {
  createSuite(callbackOrName as any, callback as any);
}

export const fdescribe : Describe = (callbackOrName: string|UserCallback, callback?: UserCallback) => {
  const suite = createSuite(callbackOrName as any, callback as any);
  suite.focused = true;
}
describe.only = fdescribe;

export const xdescribe : Describe = (callbackOrName: string|UserCallback, callback?: UserCallback) => {
  const suite = createSuite(callbackOrName as any, callback as any);
  suite.skipped = true;
}
export const createSuite: Describe<Suite> = (callbackOrName: string|UserCallback, callback?: UserCallback) => {
  const name = callback ? callbackOrName as string : '';
  if (!callback)
    callback = callbackOrName as UserCallback;
  return new Suite(name, currentSuite, callback);
}

export function it(name: string, callback: UserCallback<State>) {
  new Test(name, callback);
}

export function fit(name: string, callback: UserCallback<State>) {
  const test = new Test(name, callback);
  test.focused = true;
}
it.only = fit;

export function xit(name: string, callback: UserCallback<State>) {
  const test = new Test(name, callback);
  test.skipped = true;
}

export function createTest(name: string, callback: UserCallback<State>) {
  return new Test(name, callback);
}

export type It<T> = (name: string, callback: UserCallback<T & State>) => void;
export type BeforeOrAfter<T> = (callback: UserCallback<T & State>) => void;

export function beforeEach(callback: UserCallback<State>) {
  currentSuite._beforeEaches.push(callback);
}

export function afterEach(callback: UserCallback<State>) {
  currentSuite._afterEaches.push(callback);
}

export function beforeAll(callback: UserCallback<State>) {
  currentSuite._beforeAlls.push(callback);
}

export function afterAll(callback: UserCallback<State>) {
  currentSuite._afterAlls.push(callback);
}

const rootSuite = new Suite('', null);
let currentSuite = rootSuite;

export type {Test};
