const { Breaker, BreakerOpenError } = require('./lib/breaker');

exports.Breaker = Breaker;
exports.BreakerOpenError = BreakerOpenError;
exports.create = (...args) => new Breaker(...args);
