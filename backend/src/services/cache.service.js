const redis = require('../config/redis');

const DEFAULT_TTL = 300; // 5 minutes

async function get(key) {
  const raw = await redis.get(key);
  return raw ? JSON.parse(raw) : null;
}

async function set(key, value, ttlSeconds = DEFAULT_TTL) {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

async function del(key) {
  await redis.del(key);
}

async function invalidatePattern(pattern) {
  const keys = await redis.keys(pattern);
  if (keys.length) await redis.del(...keys);
}

async function getOrSet(key, fetchFn, ttlSeconds = DEFAULT_TTL) {
  const cached = await get(key);
  if (cached !== null) return cached;
  const data = await fetchFn();
  await set(key, data, ttlSeconds);
  return data;
}

module.exports = { get, set, del, invalidatePattern, getOrSet };
