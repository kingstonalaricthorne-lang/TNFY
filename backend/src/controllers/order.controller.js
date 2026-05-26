const OrderModel = require('../models/Order');
const CartModel = require('../models/Cart');
const VariantModel = require('../models/ProductVariant');
const { createCheckoutSession } = require('../services/stripe.service');
const { validateCoupon, calculateDiscount, incrementCouponUsage } = require('../services/discount.service');
const { sendOrderConfirmation } = require('../services/email.service');
const UserModel = require('../models/User');
const ApiError = require('../utils/ApiError');

async function createOrder(req, res, next) {
  try {
    const { addressId, couponCode } = req.body;
    const userId = req.user.userId;

    const cart = await CartModel.findByUser(userId);
    if (!cart || !cart.items.length) throw ApiError.badRequest('Cart is empty');

    let subtotal = 0;
    const itemsData = [];

    for (const ci of cart.items) {
      const variant = ci.variant;
      const product = variant?.product;

      if (!product || !product.isActive) {
        throw ApiError.badRequest(`Product unavailable: ${product?.name || 'unknown'}`);
      }
      if (variant.stockQty < ci.quantity) {
        const label = [variant.size, variant.color].filter(Boolean).join(' / ');
        throw ApiError.badRequest(`Insufficient stock for: ${product.name} (${label})`);
      }

      const unitPrice = Number(product.salePrice ?? product.basePrice);
      const totalPrice = unitPrice * ci.quantity;
      subtotal += totalPrice;

      itemsData.push({
        variantId: variant.id,
        productName: product.name,
        size: variant.size || null,
        color: variant.color || null,
        quantity: ci.quantity,
        unitPrice,
        totalPrice,
      });
    }

    let discountAmount = 0;
    let couponId = null;
    let appliedCoupon = null;

    if (couponCode) {
      appliedCoupon = await validateCoupon(couponCode, subtotal);
      discountAmount = calculateDiscount(appliedCoupon, subtotal);
      couponId = appliedCoupon.id;
    }

    const shippingFee = subtotal - discountAmount >= 100 ? 0 : 9.95;
    const total = subtotal - discountAmount + shippingFee;

    const order = await OrderModel.create({
      userId,
      addressId: addressId || null,
      status: 'pending',
      subtotal,
      discountAmount,
      shippingFee,
      total,
      couponId,
      items: { create: itemsData },
    });

    if (appliedCoupon) await incrementCouponUsage(appliedCoupon.id);

    await Promise.all(
      itemsData.map((item) => VariantModel.decrementStock(item.variantId, item.quantity))
    );

    await CartModel.clear(userId);

    const session = await createCheckoutSession({
      order,
      successUrl: `${process.env.CLIENT_URL}/me/orders/${order.id}?success=1`,
      cancelUrl: `${process.env.CLIENT_URL}/checkout?cancelled=1`,
    });

    await OrderModel.update(order.id, { stripePiId: session.id });

    const user = await UserModel.findById(userId);
    sendOrderConfirmation(user, order).catch(() => {});

    res.status(201).json({ success: true, data: { order, checkoutUrl: session.url } });
  } catch (err) {
    next(err);
  }
}

async function cancelOrder(req, res, next) {
  try {
    const order = await OrderModel.findById(req.params.id);
    if (!order) throw ApiError.notFound('Order not found');
    if (order.userId !== req.user.userId && req.user.role !== 'admin') throw ApiError.forbidden();
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw ApiError.badRequest('Order cannot be cancelled at this stage');
    }
    const updated = await OrderModel.update(order.id, { status: 'cancelled' });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// Admin endpoints
async function getAllOrders(req, res, next) {
  try {
    const result = await OrderModel.findAll(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { status, paymentStatus, trackingNumber } = req.body;
    const data = {};
    if (status) data.status = status;
    if (paymentStatus) data.paymentStatus = paymentStatus;
    if (trackingNumber) data.trackingNumber = trackingNumber;
    const order = await OrderModel.update(req.params.id, data);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, cancelOrder, getAllOrders, updateOrderStatus };
