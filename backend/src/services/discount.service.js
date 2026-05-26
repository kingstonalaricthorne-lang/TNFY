const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');

async function validateCoupon(code, orderSubtotal) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

  if (!coupon || !coupon.isActive) throw ApiError.badRequest('Invalid or inactive coupon code');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw ApiError.badRequest('Coupon has expired');
  if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) {
    throw ApiError.badRequest('Coupon usage limit reached');
  }
  if (coupon.minOrderValue && orderSubtotal < Number(coupon.minOrderValue)) {
    throw ApiError.badRequest(
      `Minimum order amount $${Number(coupon.minOrderValue).toFixed(2)} required`
    );
  }

  return coupon;
}

function calculateDiscount(coupon, subtotal) {
  if (coupon.type === 'percentage') {
    return Math.min((subtotal * Number(coupon.value)) / 100, subtotal);
  }
  return Math.min(Number(coupon.value), subtotal);
}

async function incrementCouponUsage(couponId) {
  await prisma.coupon.update({
    where: { id: couponId },
    data: { usesCount: { increment: 1 } },
  });
}

module.exports = { validateCoupon, calculateDiscount, incrementCouponUsage };
