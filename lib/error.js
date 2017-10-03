class ExtendableError extends Error {
  constructor(...args) {
    super(...args);
    Error.captureStackTrace(this, this.constructor);
  }
  get name() {
    return this.constructor.name;
  }
}

exports.ExtendableError = ExtendableError;
