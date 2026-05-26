require('dotenv').config();
const app = require('./src/app');
const prisma = require('./src/config/db');
const redis = require('./src/config/redis');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected via Prisma');

    await redis.ping();
    console.log('Redis ready');

    const server = app.listen(PORT, () => {
      console.log(`TNYF API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received — shutting down gracefully`);
      server.close(async () => {
        await prisma.$disconnect();
        await redis.quit();
        console.log('Connections closed. Exiting.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Rejection:', reason);
      shutdown('unhandledRejection');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
