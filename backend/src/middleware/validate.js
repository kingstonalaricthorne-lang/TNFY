const ApiError = require('../utils/ApiError');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return next(ApiError.badRequest('Validation failed', errors));
    }

    req.validated = result.data;
    next();
  };
}

module.exports = { validate };
