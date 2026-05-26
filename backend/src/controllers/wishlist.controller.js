const WishlistModel = require('../models/Wishlist');

async function getWishlist(req, res, next) {
  try {
    const items = await WishlistModel.findByUser(req.user.userId);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

async function toggleWishlist(req, res, next) {
  try {
    const result = await WishlistModel.toggle(req.user.userId, req.params.productId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getWishlist, toggleWishlist };
