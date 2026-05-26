const prisma = require('../config/db');

async function findByUser(userId) {
  return prisma.wishlist.findMany({
    where: { userId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          salePrice: true,
          discountPct: true,
          stockTotal: true,
          isActive: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
    orderBy: { addedAt: 'desc' },
  });
}

async function toggle(userId, productId) {
  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { userId_productId: { userId, productId } } });
    return { wishlisted: false };
  }

  await prisma.wishlist.create({ data: { userId, productId } });
  return { wishlisted: true };
}

async function isWishlisted(userId, productId) {
  const item = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  return !!item;
}

module.exports = { findByUser, toggle, isWishlisted };
