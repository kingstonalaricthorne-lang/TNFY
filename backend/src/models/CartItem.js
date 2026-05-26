const prisma = require('../config/db');

async function upsert(cartId, { variantId, quantity }) {
  return prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId } },
    create: { cartId, variantId, quantity },
    update: { quantity: { increment: quantity } },
  });
}

async function setQuantity(id, quantity) {
  if (quantity <= 0) return prisma.cartItem.delete({ where: { id } });
  return prisma.cartItem.update({ where: { id }, data: { quantity } });
}

async function remove(id) {
  return prisma.cartItem.delete({ where: { id } });
}

module.exports = { upsert, setQuantity, remove };
