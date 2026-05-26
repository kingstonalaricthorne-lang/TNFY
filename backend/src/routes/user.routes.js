const router = require('express').Router();
const { getAllUsers } = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// Admin only
router.get('/', authenticate, requireAdmin, getAllUsers);

module.exports = router;
