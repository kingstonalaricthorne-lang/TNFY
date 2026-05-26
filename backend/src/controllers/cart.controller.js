const CartModel = require('../models/Cart');
const CartItemModel = require('../models/CartItem');
const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get cart for either authenticated user or guest session.
 * Priority: authenticated user (req.user.userId) > sessionId from query/body
 */
async function getCartByContext(req) {
  const userId = req.user?.userId;
  const sessionId = req.query.sessionId || req.body?.sessionId;

  if (userId) {
    return CartModel.findOrCreate(userId);
  }
  if (sessionId) {
    return CartModel.findOrCreateForSession(sessionId);
  }

  throw ApiError.badRequest('Either authenticate or provide sessionId');
}

/**
 * Verify cart item ownership (user or session).
 */
async function verifyCartItemOwnership(itemId, userId, sessionId) {
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: { select: { userId: true, sessionId: true } } },
  });

  if (!item) throw ApiError.notFound('Cart item not found');

  const cartOwnershipValid = userId
    ? item.cart.userId === userId
    : item.cart.sessionId === sessionId;

  if (!cartOwnershipValid) {
    throw ApiError.forbidden('You do not own this cart item');
  }

  return item;
}

// ─── Cart endpoints ───────────────────────────────────────────────────────────

async function getCart(req, res, next) {
  try {
    const cart = await getCartByContext(req);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
}

async function addItem(req, res, next) {
  try {
    const { variantId, quantity = 1 } = req.body;
    if (!variantId) throw ApiError.badRequest('variantId is required');

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { id: true, name: true, isActive: true } } },
    });

    if (!variant) throw ApiError.notFound('Product variant not found');
    if (!variant.product.isActive) throw ApiError.badRequest('Product is not available');
    if (variant.stockQty < quantity) throw ApiError.badRequest('Insufficient stock');

    const cart = await getCartByContext(req);
    await CartItemModel.upsert(cart.id, { variantId, quantity });

    const updated = req.user?.userId
      ? await CartModel.findByUser(req.user.userId)
      : await CartModel.findBySession(req.query.sessionId || req.body?.sessionId);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const { quantity } = req.body;
    const userId = req.user?.userId;
    const sessionId = req.query.sessionId || req.body?.sessionId;

    // Verify ownership
    await verifyCartItemOwnership(req.params.itemId, userId, sessionId);

    await CartItemModel.setQuantity(req.params.itemId, quantity);

    const updated = userId
      ? await CartModel.findByUser(userId)
      : await CartModel.findBySession(sessionId);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function removeItem(req, res, next) {
  try {
    const userId = req.user?.userId;
    const sessionId = req.query.sessionId || req.body?.sessionId;

    // Verify ownership
    await verifyCartItemOwnership(req.params.itemId, userId, sessionId);

    await CartItemModel.remove(req.params.itemId);

    const updated = userId
      ? await CartModel.findByUser(userId)
      : await CartModel.findBySession(sessionId);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function clearCart(req, res, next) {
  try {
    const userId = req.user?.userId;
    const sessionId = req.query.sessionId || req.body?.sessionId;

    if (!userId && !sessionId) {
      throw ApiError.badRequest('Either authenticate or provide sessionId');
    }

    if (userId) {
      await CartModel.clear(userId);
    } else if (sessionId) {
      const cart = await CartModel.findBySession(sessionId);
      if (cart) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      }
    }

    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    next(err);
  }
}

/**
 * Merge guest cart into authenticated user's cart.
 * Authenticated users only.
 */
async function mergeCart(req, res, next) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) throw ApiError.badRequest('sessionId is required');

    const userId = req.user?.userId;
    if (!userId) throw ApiError.unauthorized('Must be authenticated to merge carts');

    const merged = await CartModel.mergeSession(sessionId, userId);
    res.json({ success: true, data: merged });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart, mergeCart };
