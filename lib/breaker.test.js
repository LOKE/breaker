import test from 'ava';
import { Breaker, BreakerOpenError } from './breaker';

class DumbMetricsBuckets {
  constructor(zero) {
    this.value = zero();
    this.zero = zero;
  }
  getCurrent() {
    return this.value;
  }
  reduce(fn, inital = this.zero()) {
    const acc = inital;

    return fn(acc, this.value, 0);
  }
}

const errFn = () => Promise.reject(new Error('fn error'));

test('breaker should start closed', t => {
  const breaker = new Breaker({
    name: 'some_breaker'
  });

  t.is(breaker.isOpen(), false);
});

test('breaker should open after hitting threashold', async t => {
  const breaker = new Breaker({
    rateThreshold: 0,
    name: 'some_breaker',
    MetricsBuckets: DumbMetricsBuckets,
    now: () => 1
  });

  await t.throws(breaker.exec(errFn), 'fn error');

  t.is(breaker.isOpen(), true);
});

test('breaker should skip requests once open', async t => {
  const breaker = new Breaker({
    rateThreshold: 0,
    name: 'some_breaker',
    MetricsBuckets: DumbMetricsBuckets,
    now: () => 1
  });

  await t.throws(breaker.exec(errFn), 'fn error');

  const error = await t.throws(breaker.exec(errFn), BreakerOpenError);
  t.is(error.code, 'BREAKER_OPEN');
  t.is(error.name, 'BreakerOpenError');
});

test('breaker should let 1 request through after 1 sec', async t => {
  let time = 1;

  const breaker = new Breaker({
    rateThreshold: 0,
    name: 'some_breaker',
    MetricsBuckets: DumbMetricsBuckets,
    now: () => time
  });

  await t.throws(breaker.exec(errFn), 'fn error');
  await t.throws(breaker.exec(errFn), BreakerOpenError);

  time += 1001;

  await t.throws(breaker.exec(errFn), 'fn error');
  await t.throws(breaker.exec(errFn), BreakerOpenError);
});

test('breaker should recover after successfull probe', async t => {
  let time = 1;

  const breaker = new Breaker({
    rateThreshold: 0,
    name: 'some_breaker',
    MetricsBuckets: DumbMetricsBuckets,
    now: () => time
  });

  await t.throws(breaker.exec(errFn), 'fn error');
  await t.throws(breaker.exec(errFn), BreakerOpenError);

  time += 1001;

  await breaker.exec(() => {});
  t.is(breaker.isOpen(), false);
});
