const { Breaker } = require('./lib/breaker');

exports.Breaker = Breaker;
exports.create = (...args) => new Breaker(...args);
