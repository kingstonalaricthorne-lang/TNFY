const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const {
  issueTokenPair,
  revokeRefreshToken,
  getRefreshTokenData,
  blacklistAccessToken,
  createPasswordResetToken,
  getPasswordResetData,
  deletePasswordResetToken,
  createEmailVerifyToken,
  getEmailVerifyData,
  deleteEmailVerifyToken,
} = require('../utils/generateToken');
const {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../services/email.service');
const ApiError = require('../utils/ApiError');

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const COOKIE_NAME = 'tnyf_rt';

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/api/auth',
  };
}

function setRefreshCookie(res, token) {
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

function clearRefreshCookie(res) {
  const opts = cookieOptions();
  delete opts.maxAge;
  res.clearCookie(COOKIE_NAME, opts);
}

// ─── Controllers ─────────────────────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const { email, password, name, phone, gender } = req.body;

    const existing = await UserModel.findByEmail(email);
    if (existing) throw ApiError.conflict('Email already registered');

    const user = await UserModel.create({ email, password, name, phone, gender });
    const { accessToken, refreshToken } = await issueTokenPair(user);
    setRefreshCookie(res, refreshToken);

    const verifyToken = await createEmailVerifyToken(user.id);
    sendVerificationEmail(user.email, verifyToken).catch(() => {});
    sendWelcomeEmail(user).catch(() => {});

    res.status(201).json({ success: true, data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const userWithHash = await UserModel.findByEmail(email);
    if (!userWithHash) throw ApiError.unauthorized('Invalid credentials');

    const valid = await UserModel.verifyPassword(password, userWithHash.passwordHash);
    if (!valid) throw ApiError.unauthorized('Invalid credentials');

    const { passwordHash, ...user } = userWithHash;
    const { accessToken, refreshToken } = await issueTokenPair(user);
    setRefreshCookie(res, refreshToken);

    res.json({ success: true, data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies[COOKIE_NAME];
    if (refreshToken) await revokeRefreshToken(refreshToken);
    clearRefreshCookie(res);

    // Blacklist the access token for its remaining lifetime
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.jti && decoded.exp) await blacklistAccessToken(decoded.jti, decoded.exp);
      } catch {
        // Already expired — nothing to blacklist
      }
    }

    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies[COOKIE_NAME];
    if (!refreshToken) throw ApiError.unauthorized('No refresh token');

    const tokenData = await getRefreshTokenData(refreshToken);
    if (!tokenData) throw ApiError.unauthorized('Invalid or expired refresh token');

    // Rotate: revoke old token before issuing new pair
    await revokeRefreshToken(refreshToken);

    const user = await UserModel.findById(tokenData.userId);
    if (!user) throw ApiError.unauthorized('User not found');

    const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(user);
    setRefreshCookie(res, newRefreshToken);

    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await UserModel.findById(req.user.userId);
    if (!user) throw ApiError.notFound('User not found');
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await UserModel.findByEmail(email);

    // Always respond the same way — never reveal whether the email is registered
    if (user) {
      const token = await createPasswordResetToken(user.id);
      sendPasswordResetEmail(user.email, token).catch(() => {});
    }

    res.json({
      success: true,
      message: 'If that email is registered, a reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) throw ApiError.badRequest('Token and new password are required');

    const data = await getPasswordResetData(token);
    if (!data) throw ApiError.badRequest('Invalid or expired reset token');

    await UserModel.update(data.userId, { password: newPassword });
    await deletePasswordResetToken(token);

    res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.params;

    const data = await getEmailVerifyData(token);
    if (!data) throw ApiError.badRequest('Invalid or expired verification link');

    await UserModel.update(data.userId, { isVerified: true });
    await deleteEmailVerifyToken(token);

    return res.redirect(`${process.env.CLIENT_URL}/verify-email?success=1`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  refresh,
  me,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
