const { EventEmitter } = require('events');
const { Rolling } = require('./rolling');
const { ExtendableError } = require('./error');

const BREAKER_STATE = Symbol('breaker.state');

const OPEN = Symbol('breaker.state.open');
const CLOSED = Symbol('breaker.state.closed');
const HALF_OPEN = Symbol('breaker.state.half_open');

const zero = () => ({ count: 0, failures: 0 });

class BreakerOpenError extends ExtendableError {
  get code() {
    return 'BREAKER_OPEN';
  }
}

class Breaker extends EventEmitter {
  constructor(
    {
      rateThreshold = 5,
      failureThreshold = 0.5,
      name,
      MetricsBuckets = Rolling,
      now = Date.now
    } = {}
  ) {
    super();
    this.name = name;
    this.rateThreshold = rateThreshold;
    this.failureThreshold = failureThreshold;
    this.timeout = 0;
    this.MetricsBuckets = MetricsBuckets;
    this.now = now;
    this._reset();
  }
  _requestAllowed() {
    switch (this[BREAKER_STATE]) {
      case CLOSED: {
        if (this.isOpen()) {
          this._trigger();
        }
        break;
      }

      case OPEN:
      case HALF_OPEN:
        if (this.timeout < this.now()) {
          this[BREAKER_STATE] = HALF_OPEN;
          this.timeout = this.now() + 1000;
          return true;
        }
        break;

      default:
        throw new Error('Breaker in unknown state');
    }

    return this[BREAKER_STATE] === CLOSED;
  }
  _reset() {
    this[BREAKER_STATE] = CLOSED;
    this.metrics = new this.MetricsBuckets(zero);
    this.emit('close');
  }
  _trigger() {
    this[BREAKER_STATE] = OPEN;
    this.timeout = this.now() + 1000;
    this.emit('open');
  }
  isOpen() {
    const { count, failures } = this.metrics.reduce((c, m) => {
      return {
        count: c.count + m.count,
        failures: c.failures + m.failures
      };
    }, zero());

    const failureRate = count && failures / count;

    return count >= this.rateThreshold && failureRate > this.failureThreshold;
  }
  _success() {
    const metrics = this.metrics.getCurrent();
    if (this[BREAKER_STATE] === HALF_OPEN) {
      this._reset();
    }
    metrics.count += 1;
    this.emit('success');
  }
  _failure() {
    const metrics = this.metrics.getCurrent();
    metrics.failures += 1;
    metrics.count += 1;
    this.emit('failure');
  }
  _block() {
    this.emit('block');
    return Promise.reject(new BreakerOpenError(this.name));
  }
  exec(fn, ...args) {
    if (!this._requestAllowed()) {
      return this._block();
    }
    return Promise.resolve(fn(...args)).then(
      res => {
        this._success();
        return res;
      },
      err => {
        this._failure();
        throw err;
      }
    );
  }
}

exports.Breaker = Breaker;
exports.BreakerOpenError = BreakerOpenError;
