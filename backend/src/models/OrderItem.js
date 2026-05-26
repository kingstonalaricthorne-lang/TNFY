const prisma = require('../config/db');

async function createMany(orderId, items) {
  const data = items.map((item) => ({ ...item, orderId }));
  return prisma.orderItem.createMany({ data });
}

async function findByOrder(orderId) {
  return prisma.orderItem.findMany({
    where: { orderId },
    include: { variant: { select: { id: true, size: true, color: true, sku: true } } },
  });
}

module.exports = { createMany, findByOrder };
