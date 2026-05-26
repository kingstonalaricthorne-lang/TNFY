const ApiError = require('../utils/ApiError');

function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    // err.errors can be an array (default) or an object (e.g. Zod fieldErrors)
    const hasErrors = Array.isArray(err.errors)
      ? err.errors.length > 0
      : err.errors && Object.keys(err.errors).length > 0;

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: hasErrors ? err.errors : undefined,
    });
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: `Duplicate value for field: ${err.meta?.target?.join(', ')}`,
    });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found',
    });
  }

  console.error('[ERROR]', err);

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}

module.exports = { errorHandler };
