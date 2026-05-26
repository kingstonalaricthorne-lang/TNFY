const router = require('express').Router();
const {
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
} = require('../controllers/me.controller');
const { authenticate } = require('../middleware/auth');

// All /me routes require a valid access token
router.use(authenticate);

// Profile
router.get('/', getProfile);
router.put('/', updateProfile);
router.put('/password', changePassword);

// Addresses
router.get('/addresses', getAddresses);
router.post('/addresses', createAddress);
router.put('/addresses/:id/default', setDefaultAddress); // must be before /:id
router.put('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);

// Orders (read-only — creation stays on POST /api/orders)
router.get('/orders', getOrders);
router.get('/orders/:id', getOrder);

module.exports = router;
