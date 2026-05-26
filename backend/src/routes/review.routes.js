const router = require('express').Router();
const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
} = require('../controllers/review.controller');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// Mounted at /api/reviews → GET /api/reviews/products/:productId
router.get('/products/:productId', getProductReviews);

router.post('/', authenticate, createReview);
router.put('/:id', authenticate, updateReview);
router.delete('/:id', authenticate, deleteReview);

module.exports = router;
