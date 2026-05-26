const router = require('express').Router();
const {
  getProducts,
  getFeatured,
  getTrending,
  getNewIn,
  getSale,
  getDiscountZone,
  searchProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/product.controller');
const {
  getVariants, createVariant, updateVariant, deleteVariant,
  getImages, createImage, updateImage, deleteImage,
} = require('../controllers/variant.controller');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// ─── Static collection routes (MUST come before /:slug) ──────────────────────
router.get('/featured',      getFeatured);
router.get('/trending',      getTrending);
router.get('/new-in',        getNewIn);
router.get('/sale',          getSale);
router.get('/discount-zone', getDiscountZone);
router.get('/search',        searchProducts);

// ─── Root listing ─────────────────────────────────────────────────────────────
router.get('/', getProducts);

// ─── Single product by slug or UUID ──────────────────────────────────────────
router.get('/:slug', getProduct);

// ─── Admin CRUD ───────────────────────────────────────────────────────────────
router.post('/',     authenticate, requireAdmin, createProduct);
router.put('/:id',   authenticate, requireAdmin, updateProduct);
router.delete('/:id', authenticate, requireAdmin, deleteProduct);

// ─── Variants (sub-resource) ──────────────────────────────────────────────────
router.get('/:productId/variants',              getVariants);
router.post('/:productId/variants',             authenticate, requireAdmin, createVariant);
router.put('/:productId/variants/:variantId',   authenticate, requireAdmin, updateVariant);
router.delete('/:productId/variants/:variantId', authenticate, requireAdmin, deleteVariant);

// ─── Images (sub-resource) ────────────────────────────────────────────────────
router.get('/:productId/images',              getImages);
router.post('/:productId/images',             authenticate, requireAdmin, createImage);
router.put('/:productId/images/:imageId',     authenticate, requireAdmin, updateImage);
router.delete('/:productId/images/:imageId',  authenticate, requireAdmin, deleteImage);

module.exports = router;
