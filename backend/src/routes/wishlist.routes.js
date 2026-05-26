const router = require('express').Router();
const { getWishlist, toggleWishlist } = require('../controllers/wishlist.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getWishlist);
router.post('/:productId', toggleWishlist);

module.exports = router;
