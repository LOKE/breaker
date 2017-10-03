const ROLLING_BUCKETS = Symbol('rolling.buckets');

const seconds = t => (t / 1000) | 0;
const nowInSeconds = () => seconds(Date.now());

class Rolling {
  constructor(zero, now = nowInSeconds, bucketCount = 10) {
    this[ROLLING_BUCKETS] = new Array(bucketCount).fill({
      timestamp: 0,
      value: null
    });
    this.zero = zero;
    this.now = now;
  }
  getCurrent() {
    const buckets = this[ROLLING_BUCKETS];
    const now = this.now();
    const index = now % buckets.length;
    let bucket = buckets[index];

    if (bucket.timestamp !== now || !bucket.value) {
      bucket = {
        timestamp: now,
        value: this.zero()
      };
      buckets[index] = bucket;
    }
    return bucket.value;
  }
  reduce(fn, inital = this.zero()) {
    let acc = inital;

    for (const [timestamp, value] of this) {
      acc = fn(acc, value, timestamp);
    }

    return acc;
  }
  *[Symbol.iterator]() {
    const now = this.now();
    const bucketCount = this[ROLLING_BUCKETS].length;

    for (const b of this[ROLLING_BUCKETS]) {
      if (b.timestamp <= now - bucketCount) continue;
      yield [b.timestamp, b.value];
    }
  }
}

exports.Rolling = Rolling;
