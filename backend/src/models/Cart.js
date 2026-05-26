const prisma = require('../config/db');

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              salePrice: true,
              discountPct: true,
              isActive: true,
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
      },
    },
    orderBy: { addedAt: 'asc' },
  },
};

async function findByUser(userId) {
  return prisma.cart.findFirst({ where: { userId }, include: cartInclude });
}

async function findOrCreate(userId) {
  let cart = await prisma.cart.findFirst({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
  }
  return prisma.cart.findFirst({ where: { id: cart.id }, include: cartInclude });
}

async function findBySession(sessionId) {
  return prisma.cart.findFirst({ where: { sessionId }, include: cartInclude });
}

async function findOrCreateForSession(sessionId) {
  let cart = await prisma.cart.findFirst({ where: { sessionId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { sessionId } });
  }
  return prisma.cart.findFirst({ where: { id: cart.id }, include: cartInclude });
}

async function clear(userId) {
  const cart = await prisma.cart.findFirst({ where: { userId } });
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

async function mergeSession(sessionId, userId) {
  // Find guest cart and user cart
  const guestCart = await prisma.cart.findFirst({ where: { sessionId } });
  const userCart = await prisma.cart.findFirst({ where: { userId } });

  if (!guestCart) return userCart; // No guest cart to merge

  // If user has no cart yet, convert guest cart to user cart
  if (!userCart) {
    await prisma.cart.update({
      where: { id: guestCart.id },
      data: { userId, sessionId: null },
    });
    return prisma.cart.findFirst({ where: { id: guestCart.id }, include: cartInclude });
  }

  // Both carts exist: merge items, preferring user cart
  const guestItems = await prisma.cartItem.findMany({
    where: { cartId: guestCart.id },
  });

  for (const item of guestItems) {
    // Check if item already exists in user cart
    const existing = await prisma.cartItem.findFirst({
      where: { cartId: userCart.id, variantId: item.variantId },
    });

    if (existing) {
      // Update quantity (additive)
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: item.quantity } },
      });
    } else {
      // Add new item to user cart
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          variantId: item.variantId,
          quantity: item.quantity,
        },
      });
    }
  }

  // Delete guest cart and its items
  await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
  await prisma.cart.delete({ where: { id: guestCart.id } });

  // Return updated user cart
  return prisma.cart.findFirst({ where: { id: userCart.id }, include: cartInclude });
}

module.exports = { findByUser, findOrCreate, findBySession, findOrCreateForSession, clear, mergeSession };
