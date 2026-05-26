const router = require('express').Router();
const { createOrder, cancelOrder, getAllOrders, updateOrderStatus } = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

router.use(authenticate);

router.post('/', createOrder);
router.patch('/:id/cancel', cancelOrder);

// Admin
router.get('/admin/all', requireAdmin, getAllOrders);
router.patch('/:id/status', requireAdmin, updateOrderStatus);

module.exports = router;
