import test from 'ava';
import { Rolling } from './rolling';

const zero = () => ({ x: 0 });

test('Rolling#getCurrent', t => {
  let time = 100;
  const now = () => time;

  const r = new Rolling(zero, now);

  t.deepEqual(r.getCurrent(), { x: 0 }, 'should return zero value');

  const bucketOne = r.getCurrent();

  t.is(
    r.getCurrent(),
    bucketOne,
    'should return the same object in the same time'
  );

  time += 1;

  t.not(
    r.getCurrent(),
    bucketOne,
    'should return a new object for the next time value'
  );
});

test('Rolling#reduce', t => {
  let time = 100;
  const now = () => time;

  const r = new Rolling(zero, now);

  for (let i = 0; i < 5; i++) {
    time += 1;
    const v = r.getCurrent();
    v.x = i;
  }

  t.is(
    r.reduce((acc, v) => acc + v.x, 0),
    1 + 2 + 3 + 4,
    'should work when inital value is provided'
  );
  t.is(
    r.reduce((a, b) => ({ x: a.x + b.x })).x,
    1 + 2 + 3 + 4,
    'should use zero value if no inital value is provided'
  );

  for (let i = 0; i < 10; i++) {
    time += 1;
    const v = r.getCurrent();
    v.x = 20;
  }

  t.is(
    r.reduce((acc, v) => acc + v.x, 0),
    200,
    'should only keep track of the last 10 values'
  );
});

test('Rolling#reduce (real time sanitiy check, brittle)', t => {
  const r = new Rolling(zero);

  r.getCurrent();

  t.pass();
});
