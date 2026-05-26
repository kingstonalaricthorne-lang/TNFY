const CouponModel = require('../models/Coupon');
const { validateCoupon, calculateDiscount } = require('../services/discount.service');
const ApiError = require('../utils/ApiError');

async function validateCode(req, res, next) {
  try {
    const { code, subtotal } = req.body;
    const coupon = await validateCoupon(code, parseFloat(subtotal));
    const discount = calculateDiscount(coupon, parseFloat(subtotal));
    res.json({ success: true, data: { coupon, discount } });
  } catch (err) {
    next(err);
  }
}

// Admin
async function getCoupons(req, res, next) {
  try {
    const coupons = await CouponModel.findAll();
    res.json({ success: true, data: coupons });
  } catch (err) {
    next(err);
  }
}

async function createCoupon(req, res, next) {
  try {
    const coupon = await CouponModel.create(req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (err) {
    next(err);
  }
}

async function updateCoupon(req, res, next) {
  try {
    const coupon = await CouponModel.update(req.params.id, req.body);
    res.json({ success: true, data: coupon });
  } catch (err) {
    next(err);
  }
}

async function deleteCoupon(req, res, next) {
  try {
    await CouponModel.remove(req.params.id);
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { validateCode, getCoupons, createCoupon, updateCoupon, deleteCoupon };
