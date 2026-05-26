const jwt = require('jsonwebtoken');
const { isTokenBlacklisted } = require('../utils/generateToken');
const ApiError = require('../utils/ApiError');

/**
 * Strict authentication: rejects requests without a valid Bearer token.
 * Sets req.user = { userId, role, gender, jti, exp, iat }
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing or invalid Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(ApiError.unauthorized('Access token expired'));
    return next(ApiError.unauthorized('Invalid access token'));
  }

  if (payload.jti && await isTokenBlacklisted(payload.jti)) {
    return next(ApiError.unauthorized('Token has been revoked'));
  }

  req.user = payload;
  next();
}

/**
 * Optional authentication: populates req.user when a valid Bearer token is
 * present, but never fails the request. Used for cart endpoints that support
 * both authenticated users and guest sessions.
 */
async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.jti && (await isTokenBlacklisted(payload.jti))) return next();
    req.user = payload;
  } catch {
    // Invalid/expired token — proceed as guest
  }
  next();
}

module.exports = { authenticate, optionalAuthenticate };
