const Redis = require('ioredis');

// Prefer REDIS_URL (Upstash, Railway, Render, etc.) — falls back to host/port/password.
// Upstash uses rediss:// (TLS); ioredis auto-enables TLS when the URL scheme is rediss.
const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    })
  : new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err.message));
redis.on('close', () => console.warn('Redis connection closed'));

module.exports = redis;
