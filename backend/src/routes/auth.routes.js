const router = require('express').Router();
const {
  register,
  login,
  logout,
  refresh,
  me,
  forgotPassword,
  resetPassword,
  verifyEmail,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { authLimiter, strictLimiter } = require('../middleware/rateLimit');

// Account creation & login
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Token management
router.post('/logout', logout);
router.post('/refresh', refresh);

// Current user (requires valid access token)
router.get('/me', authenticate, me);

// Password reset (strict rate limit — 5 req/hr)
router.post('/forgot-password', strictLimiter, forgotPassword);
router.post('/reset-password', strictLimiter, resetPassword);

// Email verification (link clicked from inbox)
router.get('/verify-email/:token', verifyEmail);

module.exports = router;
