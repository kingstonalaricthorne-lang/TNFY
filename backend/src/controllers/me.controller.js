const UserModel = require('../models/User');
const AddressModel = require('../models/Address');
const OrderModel = require('../models/Order');
const ApiError = require('../utils/ApiError');

// ─── Profile ─────────────────────────────────────────────────────────────────

async function getProfile(req, res, next) {
  try {
    const user = await UserModel.findById(req.user.userId);
    if (!user) throw ApiError.notFound('User not found');
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, phone, gender, avatarUrl } = req.body;
    const user = await UserModel.update(req.user.userId, { name, phone, gender, avatarUrl });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw ApiError.badRequest('currentPassword and newPassword are required');
    }

    // findById returns no hash; fetch full record via email to verify
    const me = await UserModel.findById(req.user.userId);
    if (!me) throw ApiError.notFound('User not found');

    const userWithHash = await UserModel.findByEmail(me.email);
    const valid = await UserModel.verifyPassword(currentPassword, userWithHash.passwordHash);
    if (!valid) throw ApiError.badRequest('Current password is incorrect');

    await UserModel.update(req.user.userId, { password: newPassword });
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

// ─── Addresses ───────────────────────────────────────────────────────────────

async function getAddresses(req, res, next) {
  try {
    const addresses = await AddressModel.findByUser(req.user.userId);
    res.json({ success: true, data: addresses });
  } catch (err) {
    next(err);
  }
}

async function createAddress(req, res, next) {
  try {
    const address = await AddressModel.create(req.user.userId, req.body);
    res.status(201).json({ success: true, data: address });
  } catch (err) {
    next(err);
  }
}

async function updateAddress(req, res, next) {
  try {
    const existing = await AddressModel.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Address not found');
    if (existing.userId !== req.user.userId) throw ApiError.forbidden();

    const address = await AddressModel.update(req.params.id, req.user.userId, req.body);
    res.json({ success: true, data: address });
  } catch (err) {
    next(err);
  }
}

async function deleteAddress(req, res, next) {
  try {
    const existing = await AddressModel.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Address not found');
    if (existing.userId !== req.user.userId) throw ApiError.forbidden();

    await AddressModel.remove(req.params.id);
    res.json({ success: true, message: 'Address deleted' });
  } catch (err) {
    next(err);
  }
}

async function setDefaultAddress(req, res, next) {
  try {
    const existing = await AddressModel.findById(req.params.id);
    if (!existing) throw ApiError.notFound('Address not found');
    if (existing.userId !== req.user.userId) throw ApiError.forbidden();

    const address = await AddressModel.setDefault(req.params.id, req.user.userId);
    res.json({ success: true, data: address });
  } catch (err) {
    next(err);
  }
}

// ─── Orders ──────────────────────────────────────────────────────────────────

async function getOrders(req, res, next) {
  try {
    const result = await OrderModel.findByUser(req.user.userId, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await OrderModel.findById(req.params.id);
    if (!order) throw ApiError.notFound('Order not found');
    if (order.userId !== req.user.userId) throw ApiError.forbidden();
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getOrders,
  getOrder,
};
