/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const testById: Test[] = [];
type UserCallback<T = void> = (state: T) => (void | Promise<void>);
type State = {[key: string]: any};

let currentSuite: Suite;

export function getCurrentSuite() {
  return currentSuite;
}
export function setCurrentSuite(suite: Suite) {
  currentSuite = suite;
}

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

export class Suite {
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
  slow = false;

  constructor(name: string, parent: Suite | null = null, callback: UserCallback | null = null) {
    this.name = name;
    this.parentSuite = parent;
    this._callback = callback || (() => void 0);

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

type Callback<Input, Output> = (input: Input) => Promise<Output>;

export class Environment<EachState, AllState, InitialState = void> {
  public it: API<EachState, AllState, InitialState>;
  public test: API<EachState, AllState, InitialState>;
  constructor(
    private hooks: {
      beforeAll: Callback<InitialState, AllState>;
      beforeEach: Callback<AllState, EachState>;

      afterEach: Callback<AllState & EachState, void>;
      afterAll: Callback<AllState, void>;
    }
  ) {
    this.it = makeAPI(this.hooks);
    this.test = this.it;
    this.extend = this.extend.bind(this);
  }

  extend<NewEachState, NewAllState>(hooks: {
    beforeAll?: Callback<AllState, NewAllState>;
    beforeEach?: Callback<AllState & NewAllState & EachState, NewEachState>;

    afterEach?: Callback<AllState & NewAllState & EachState & NewEachState, void>;
    afterAll?: Callback<AllState & NewAllState, void>;
  }) {
    const beforeAll = hooks.beforeAll! || (async state => state);
    const beforeEach = hooks.beforeEach! || (async state => state);
    const afterEach = hooks.afterEach! || (async () => void 0);
    const afterAll = hooks.afterAll! || (async () => void 0);

    const newEnvironment = new Environment<EachState & NewEachState, AllState & NewAllState, InitialState>({
      beforeAll: async state => {
        const allState = await this.hooks.beforeAll(state);
        const newAllState = await beforeAll(allState);
        return {...allState, ...newAllState};
      },
      beforeEach: async newAllState => {
        const eachState = await this.hooks.beforeEach(newAllState);
        const newEachState = await beforeEach({...eachState, ...newAllState});
        return {...eachState, ...newEachState};
      },
      afterEach: async newCombinedState => {
        await afterEach(newCombinedState);
        await this.hooks.afterEach(newCombinedState);
      },
      afterAll: async newAllState => {
        await afterAll(newAllState);
        await this.hooks.afterAll(newAllState);
      }
    });
    return newEnvironment;
  }

  mixin<NewEachState, NewAllState>(environment: Environment<NewEachState, NewAllState, InitialState>) {
    return new Environment<NewEachState & EachState, AllState & NewAllState, InitialState>({
      beforeAll: async state => {
        const first = await this.hooks.beforeAll(state);
        const second = await environment.hooks.beforeAll(state);
        return {...first, ...second};
      },
      beforeEach: async state => {
        const first = await this.hooks.beforeEach(state);
        const second = await environment.hooks.beforeEach(state);
        return {...first, ...second};
      },
      afterEach: async state => {
        await this.hooks.afterEach(state);
        await environment.hooks.afterEach(state);
      },
      afterAll: async state => {
        await this.hooks.afterAll(state);
        await environment.hooks.afterAll(state);
      },
    });
  }
}

export class Test {
  _callback: UserCallback<State>;
  name: string;
  suite: Suite;
  focused = false;
  skipped = false;

  constructor(name: string, callback: UserCallback<State>) {
    this._callback = callback;
    this.name = name;
    this.suite = currentSuite;
    const id = testById.length;
    testById.push(this);
    Object.defineProperty(callback, 'name', {
      value: `Test #${id}: ${this.fullName()}`
    });
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

export type API<EachState, AllState, InitialState = void> = {
  (name: string, callback: (state: EachState & AllState) => (void|Promise<void>)): void;
  skip(condition: boolean): API<EachState, AllState, InitialState>;
  todo(condition: boolean): API<EachState, AllState, InitialState>;
  only: API<EachState, AllState, InitialState>;
  slow: API<EachState, AllState, InitialState>;
};

function makeAPI<EachState, AllState, InitialState = void>(hooks: {
  beforeAll: Callback<InitialState, AllState>;
  beforeEach: Callback<AllState, EachState>;

  afterEach: Callback<AllState & EachState, void>;
  afterAll: Callback<AllState, void>;
}): API<EachState, AllState, InitialState> {
  type Callback = (state: EachState & AllState) => (void|Promise<void>);
  function makeTest(name: string, callback: Callback) {
    return new Test(name, async (state: unknown) => {
      const allState = await hooks.beforeAll(state as InitialState);
      const eachState = await hooks.beforeEach(allState);
      let success = true;
      let error;
      try {
        await callback({...allState, ...eachState});
      } catch (e) {
        error = e;
        success = false;
      }
      await hooks.afterEach({...allState, ...eachState});
      await hooks.afterAll(allState);
      if (!success)
        throw error;
    });
  }

  function makeTestFunction(skip: boolean, focus: boolean, slow: boolean) {
    const test = ((name: string, callback: Callback) => {
      const test = makeTest(name, callback);
      test.skipped = skip;
      test.focused = focus;
    }) as API<EachState, AllState, InitialState>;

    test.skip = condition => {
      return makeTestFunction(skip || condition, focus, slow);
    };
    test.todo = condition => {
      return makeTestFunction(skip || condition, focus, slow);
    };
    test.slow = slow ? test : makeTestFunction(skip, focus, true);

    test.only = focus ? test : makeTestFunction(skip, true, slow);

    return test;
  }

  return makeTestFunction(false, false, false);
}
