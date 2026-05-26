const prisma = require('../config/db');

async function findByProduct(productId) {
  return prisma.productVariant.findMany({
    where: { productId },
    orderBy: [{ size: 'asc' }, { color: 'asc' }],
  });
}

async function findById(id) {
  return prisma.productVariant.findUnique({
    where: { id },
    include: { product: true },
  });
}

async function create(productId, data) {
  return prisma.productVariant.create({ data: { ...data, productId } });
}

async function update(id, data) {
  return prisma.productVariant.update({ where: { id }, data });
}

async function remove(id) {
  return prisma.productVariant.delete({ where: { id } });
}

async function decrementStock(id, qty) {
  return prisma.productVariant.update({
    where: { id },
    data: { stockQty: { decrement: qty } },
  });
}

module.exports = { findByProduct, findById, create, update, remove, decrementStock };
