const ApiError = require('../utils/ApiError');

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(ApiError.forbidden('Admin access required'));
  }
  next();
}

module.exports = { requireAdmin };
