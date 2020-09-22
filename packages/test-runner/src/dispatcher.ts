/**
 * Copyright Microsoft Corporation. All rights reserved.
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

import child_process from 'child_process';
import path from 'path';
import { EventEmitter } from 'events';
import { FixturePool } from './fixtures';
import { RunPayload, TestBeginPayload, TestEndPayload, Parameters, DonePayload, TestResult, TestOutputPayload } from './ipc';
import { Config } from './config';
import { Reporter } from './reporter';
import assert from 'assert';
import { RunnerSuite, RunnerTest } from './runnerTest';

export class Dispatcher {
  private _workers = new Set<Worker>();
  private _freeWorkers: Worker[] = [];
  private _workerClaimers: (() => void)[] = [];

  private _testById = new Map<string, RunnerTest>();
  private _testOutputById = new Map<string, TestResult>();
  private _queue: RunPayload[] = [];
  private _stopCallback: () => void;
  readonly _config: Config;
  private _suite: RunnerSuite;
  private _reporter: Reporter;
  private _hasWorkerErrors = false;

  constructor(suite: RunnerSuite, config: Config, reporter: Reporter) {
    this._config = config;
    this._reporter = reporter;

    this._suite = suite;
    for (const suite of this._suite.suites) {
      for (const test of suite._allSpecs()) {
        for (const variant of test.tests as RunnerTest[])
          this._testById.set(variant._id, variant);
      }
    }

    this._queue = this._filesSortedByWorkerHash();

    // Shard tests.
    let total = this._suite.total;
    let shardDetails = '';
    if (this._config.shard) {
      total = 0;
      const shardSize = Math.ceil(this._suite.total / this._config.shard.total);
      const from = shardSize * this._config.shard.current;
      const to = shardSize * (this._config.shard.current + 1);
      shardDetails = `, shard ${this._config.shard.current + 1} or ${this._config.shard.total}`;
      let current = 0;
      const filteredQueue: RunPayload[] = [];
      for (const runPayload of this._queue) {
        if (current >= from && current < to) {
          filteredQueue.push(runPayload);
          total += runPayload.entries.length;
        }
        current += runPayload.entries.length;
      }
      this._queue = filteredQueue;
    }

    if (process.stdout.isTTY) {
      const workers = new Set<string>();
      suite.findSpec(test => {
        for (const variant of test.tests as RunnerTest[])
          workers.add(test.file + variant._workerHash);
      });
      console.log();
      const jobs = Math.min(config.jobs, workers.size);
      console.log(`Running ${total} test${total > 1 ? 's' : ''} using ${jobs} worker${jobs > 1 ? 's' : ''}${shardDetails}`);
    }
  }

  _filesSortedByWorkerHash(): RunPayload[] {
    const result: RunPayload[] = [];
    for (const suite of this._suite.suites) {
      const testsByWorkerHash = new Map<string, {
        tests: RunnerTest[],
        parameters: Parameters,
        parametersString: string
      }>();
      for (const test of suite._allSpecs()) {
        for (const variant of test.tests as RunnerTest[]) {
          let entry = testsByWorkerHash.get(variant._workerHash);
          if (!entry) {
            entry = {
              tests: [],
              parameters: variant.parameters,
              parametersString: variant._parametersString
            };
            testsByWorkerHash.set(variant._workerHash, entry);
          }
          entry.tests.push(variant);
        }
      }
      if (!testsByWorkerHash.size)
        continue;
      for (const [hash, entry] of testsByWorkerHash) {
        result.push({
          entries: entry.tests.map(test => {
            return { testId: test._id, retryNumber: 0 };
          }),
          file: suite.file,
          parameters: entry.parameters,
          parametersString: entry.parametersString,
          hash
        });
      }
    }
    result.sort((a, b) => a.hash < b.hash ? -1 : (a.hash === b.hash ? 0 : 1));
    return result;
  }

  async run() {
    // Loop in case job schedules more jobs
    while (this._queue.length)
      await this._dispatchQueue();
  }

  async _dispatchQueue() {
    const jobs = [];
    while (this._queue.length) {
      const entry = this._queue.shift();
      const requiredHash = entry.hash;
      let worker = await this._obtainWorker();
      while (!this._config.trialRun && worker.hash && worker.hash !== requiredHash) {
        this._restartWorker(worker);
        worker = await this._obtainWorker();
      }
      jobs.push(this._runJob(worker, entry));
    }
    await Promise.all(jobs);
  }

  async _runJob(worker: Worker, runPayload: RunPayload) {
    for (const entry of runPayload.entries)
      this._testOutputById.set(entry.testId, createTestResult(0));
    worker.run(runPayload);

    let doneCallback;
    const result = new Promise(f => doneCallback = f);
    const done = () => {
      for (const entry of runPayload.entries)
        this._testOutputById.delete(entry.testId);
      doneCallback();
    };

    worker.once('done', (params: DonePayload) => {
      // We won't file remaining if:
      // - there are no remaining
      // - we are here not because something failed
      // - no unrecoverable worker error
      if (!params.remaining.length && !params.failedTestId && !params.fatalError) {
        this._workerAvailable(worker);
        return done();
      }

      // When worker encounters error, we will restart it.
      this._restartWorker(worker);

      // In case of fatal error, we are done with the entry.
      if (params.fatalError) {
        // Report all the tests are failing with this error.
        for (const entry of runPayload.entries) {
          const test = this._testById.get(entry.testId);
          this._reporter.onTestBegin(test);
          const result = createTestResult(entry.retryNumber);
          result.status = 'failed';
          result.error = params.fatalError;
          test._appendResult(result);
          this._reporter.onTestEnd(test, result);
        }
        return done();
      }

      const remaining = params.remaining;

      // Only retry expected failures, not passes and only if the test failed.
      if (this._config.retries && params.failedTestId) {
        const test = this._testById.get(params.failedTestId);
        assert(test._annotations);
        assert(test.results);
        if (test.expectedStatus === 'passed' && test.results.length < this._config.retries + 1)
          remaining.unshift({ testId: test._id, retryNumber: test.results.length, annotations: test._annotations });
      }

      if (remaining.length)
        this._queue.unshift({ ...runPayload, entries: remaining });

      // This job is over, we just scheduled another one.
      return done();
    });
    return result;
  }

  async _obtainWorker() {
    // If there is worker, use it.
    if (this._freeWorkers.length)
      return this._freeWorkers.pop();
    // If we can create worker, create it.
    if (this._workers.size < this._config.jobs)
      this._createWorker();
    // Wait for the next available worker.
    await new Promise(f => this._workerClaimers.push(f));
    return this._freeWorkers.pop();
  }

  async _workerAvailable(worker) {
    this._freeWorkers.push(worker);
    if (this._workerClaimers.length) {
      const callback = this._workerClaimers.shift();
      callback();
    }
  }

  _createWorker() {
    const worker = this._config.debug ? new InProcessWorker(this) : new OopWorker(this);
    worker.on('testBegin', (params: TestBeginPayload) => {
      const test = this._testById.get(params.testId);
      if (params.retryNumber === 0) {
        assert(params.annotations);
        test._setAnnotations(params.annotations);
      } else {
        assert(!params.annotations);
      }
      this._reporter.onTestBegin(test);
    });
    worker.on('testEnd', (params: TestEndPayload) => {
      const result = params.result;
      const output = this._testOutputById.get(params.testId);
      // We've been collecting test output below.
      result.stderr = output.stderr;
      result.stdout = output.stdout;
      const test = this._testById.get(params.testId);
      test._appendResult(result);
      this._reporter.onTestEnd(test, result);
    });
    worker.on('testStdOut', (params: TestOutputPayload) => {
      const chunk = chunkFromParams(params);
      if (params.testId === undefined) {
        process.stdout.write(chunk);
        return;
      }
      const test = this._testById.get(params.testId);
      const output = this._testOutputById.get(params.testId);
      output.stdout.push(chunkFromParams(params));
      this._reporter.onTestStdOut(test, chunk);
    });
    worker.on('testStdErr', (params: TestOutputPayload) => {
      const chunk = chunkFromParams(params);
      if (params.testId === undefined) {
        process.stderr.write(chunk);
        return;
      }
      const test = this._testById.get(params.testId);
      const output = this._testOutputById.get(params.testId);
      output.stderr.push(chunkFromParams(params));
      this._reporter.onTestStdErr(test, chunk);
    });
    worker.on('teardownError', ({error}) => {
      this._hasWorkerErrors = true;
      this._reporter.onError(error);
    });
    worker.on('exit', () => {
      this._workers.delete(worker);
      if (this._stopCallback && !this._workers.size)
        this._stopCallback();
    });
    this._workers.add(worker);
    worker.init().then(() => this._workerAvailable(worker));
  }

  async _restartWorker(worker) {
    assert(!this._config.trialRun);
    await worker.stop();
    this._createWorker();
  }

  async stop() {
    if (!this._workers.size)
      return;
    const result = new Promise(f => this._stopCallback = f);
    for (const worker of this._workers)
      worker.stop();
    await result;
  }

  hasWorkerErrors(): boolean {
    return this._hasWorkerErrors;
  }
}

let lastWorkerIndex = 0;

class Worker extends EventEmitter {
  runner: Dispatcher;
  hash: string;
  index: number;

  constructor(runner) {
    super();
    this.runner = runner;
    this.index = lastWorkerIndex++;
  }

  run(entry: RunPayload) {
  }

  stop() {
  }
}

class OopWorker extends Worker {
  process: child_process.ChildProcess;
  stdout: any[];
  stderr: any[];
  constructor(runner: Dispatcher) {
    super(runner);

    this.process = child_process.fork(path.join(__dirname, 'worker.js'), {
      detached: false,
      env: {
        FORCE_COLOR: process.stdout.isTTY ? '1' : '0',
        DEBUG_COLORS: process.stdout.isTTY ? '1' : '0',
        ...process.env
      },
      // Can't pipe since piping slows down termination for some reason.
      stdio: process.env.PW_RUNNER_DEBUG ? ['inherit', 'inherit', 'inherit', 'ipc'] : ['ignore', 'ignore', 'ignore', 'ipc']
    });
    this.process.on('exit', () => this.emit('exit'));
    this.process.on('error', e => {});  // do not yell at a send to dead process.
    this.process.on('message', (message: any) => {
      const { method, params } = message;
      this.emit(method, params);
    });
  }

  async init() {
    this.process.send({ method: 'init', params: { workerIndex: this.index, ...this.runner._config } });
    await new Promise(f => this.process.once('message', f));  // Ready ack
  }

  run(entry: RunPayload) {
    this.hash = entry.hash;
    this.process.send({ method: 'run', params: { entry, config: this.runner._config } });
  }

  stop() {
    this.process.send({ method: 'stop' });
  }
}

class InProcessWorker extends Worker {
  fixturePool: FixturePool;

  constructor(runner: Dispatcher) {
    super(runner);
    this.fixturePool = require('./testRunner').fixturePool as FixturePool;
  }

  async init() {
    const { initializeImageMatcher } = require('./expect');
    initializeImageMatcher(this.runner._config);
  }

  async run(entry: RunPayload) {
    delete require.cache[entry.file];
    const { TestRunner } = require('./testRunner');
    const testRunner = new TestRunner(entry, this.runner._config, 0);
    for (const event of ['testBegin', 'testStdOut', 'testStdErr', 'testEnd', 'done'])
      testRunner.on(event, this.emit.bind(this, event));
    testRunner.run();
  }

  async stop() {
    await this.fixturePool.teardownScope('worker');
    this.emit('exit');
  }
}

function chunkFromParams(params: TestOutputPayload): string | Buffer {
  if (typeof params.text === 'string')
    return params.text;
  return Buffer.from(params.buffer, 'base64');
}

function createTestResult(retryNumber: number): TestResult {
  return {
    retryNumber: retryNumber,
    workerIndex: 0,
    duration: 0,
    status: 'passed',
    stdout: [],
    stderr: [],
    data: {},
  };
}
