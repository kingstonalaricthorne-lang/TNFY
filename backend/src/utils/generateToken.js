const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function signAccessToken(payload) {
  return jwt.sign(
    { ...payload, jti: uuidv4() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
}

async function issueTokenPair(user) {
  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    gender: user.gender || null,
  });

  const refreshToken = uuidv4();
  await redis.setex(
    `refresh:${refreshToken}`,
    REFRESH_TTL_SECONDS,
    JSON.stringify({ userId: user.id, role: user.role })
  );

  return { accessToken, refreshToken };
}

async function revokeRefreshToken(token) {
  await redis.del(`refresh:${token}`);
}

async function getRefreshTokenData(token) {
  const raw = await redis.get(`refresh:${token}`);
  return raw ? JSON.parse(raw) : null;
}

// ─── Access token blacklist (keyed by jti) ───────────────────────────────────

async function blacklistAccessToken(jti, exp) {
  const ttl = exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) await redis.setex(`blacklist:${jti}`, ttl, '1');
}

async function isTokenBlacklisted(jti) {
  return (await redis.get(`blacklist:${jti}`)) === '1';
}

// ─── Password reset token (1 hr TTL) ─────────────────────────────────────────

async function createPasswordResetToken(userId) {
  const token = uuidv4();
  await redis.setex(`reset:${token}`, 3600, JSON.stringify({ userId }));
  return token;
}

async function getPasswordResetData(token) {
  const raw = await redis.get(`reset:${token}`);
  return raw ? JSON.parse(raw) : null;
}

async function deletePasswordResetToken(token) {
  await redis.del(`reset:${token}`);
}

// ─── Email verification token (24 hr TTL) ────────────────────────────────────

async function createEmailVerifyToken(userId) {
  const token = uuidv4();
  await redis.setex(`verify:${token}`, 86400, JSON.stringify({ userId }));
  return token;
}

async function getEmailVerifyData(token) {
  const raw = await redis.get(`verify:${token}`);
  return raw ? JSON.parse(raw) : null;
}

async function deleteEmailVerifyToken(token) {
  await redis.del(`verify:${token}`);
}

module.exports = {
  signAccessToken,
  issueTokenPair,
  revokeRefreshToken,
  getRefreshTokenData,
  blacklistAccessToken,
  isTokenBlacklisted,
  createPasswordResetToken,
  getPasswordResetData,
  deletePasswordResetToken,
  createEmailVerifyToken,
  getEmailVerifyData,
  deleteEmailVerifyToken,
};
