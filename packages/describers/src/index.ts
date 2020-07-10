import {Runner} from './runner';
import {Test, Suite, setCurrentSuite, getCurrentSuite} from './test';

type UserCallback<T = void> = (state: T) => (void | Promise<void>);
type State = {[key: string]: any};

type Describe<ReturnValue=void> = {
  (name: string, callback: UserCallback): ReturnValue;
  (callback: UserCallback) : ReturnValue;
}

export const describe: Describe & {only: Describe} = (callbackOrName: string|UserCallback, callback?: UserCallback) => {
  _createSuite(callbackOrName as any, callback as any);
}

export const fdescribe : Describe = (callbackOrName: string|UserCallback, callback?: UserCallback) => {
  const suite = _createSuite(callbackOrName as any, callback as any);
  suite.focused = true;
}
describe.only = fdescribe;

export const xdescribe : Describe = (callbackOrName: string|UserCallback, callback?: UserCallback) => {
  const suite = _createSuite(callbackOrName as any, callback as any);
  suite.skipped = true;
}
const _createSuite: Describe<Suite> = (callbackOrName: string|UserCallback, callback?: UserCallback) => {
  const name = callback ? callbackOrName as string : '';
  if (!callback)
    callback = callbackOrName as UserCallback;
  return new Suite(name, getCurrentSuite(), callback);
}

export const createSuite: Describe<Suite> = (callbackOrName: string|UserCallback, callback?: UserCallback) => {
  useDefaultRunner = false;
  return _createSuite(callbackOrName as any, callback as any);
}

export function it(name: string, callback: UserCallback<State>) {
  new Test(name, callback);
}

export function fit(name: string, callback: UserCallback<State>) {
  const test = new Test(name, callback);
  test.focused = true;
}
it.only = fit;
it.beforeEach = beforeEach;
it.beforeAll = beforeAll;
it.afterEach = afterEach;
it.afterAll = afterAll;
it.describe = describe;

export const test = it;

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
  getCurrentSuite()._beforeEaches.push(callback);
}

export function afterEach(callback: UserCallback<State>) {
  getCurrentSuite()._afterEaches.push(callback);
}

export function beforeAll(callback: UserCallback<State>) {
  getCurrentSuite()._beforeAlls.push(callback);
}

export function afterAll(callback: UserCallback<State>) {
  getCurrentSuite()._afterAlls.push(callback);
}

let rootSuite = new Suite('', null);
setCurrentSuite(rootSuite);
export function clearAllTests() {
  rootSuite = new Suite('', null);
  setCurrentSuite(rootSuite);
}

let useDefaultRunner = true;
setImmediate(async () => {
  if (useDefaultRunner) {
    const runner = new Runner(rootSuite);
    await runner.run();
  }
});

export type {Test};
export {expect, setSnapshotOptions} from './expect';
export {TestWorker, Environment} from './test';