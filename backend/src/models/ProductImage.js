const prisma = require('../config/db');

async function findByProduct(productId) {
  return prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
  });
}

async function create(productId, data) {
  if (data.isPrimary) {
    await prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
  }
  return prisma.productImage.create({ data: { ...data, productId } });
}

async function update(id, data) {
  const img = await prisma.productImage.findUnique({ where: { id } });
  if (data.isPrimary && img) {
    await prisma.productImage.updateMany({ where: { productId: img.productId }, data: { isPrimary: false } });
  }
  return prisma.productImage.update({ where: { id }, data });
}

async function remove(id) {
  return prisma.productImage.delete({ where: { id } });
}

module.exports = { findByProduct, create, update, remove };
