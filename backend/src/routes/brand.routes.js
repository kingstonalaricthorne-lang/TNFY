const router = require('express').Router();
const {
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
} = require('../controllers/brand.controller');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

router.get('/', getBrands);
router.get('/:slug', getBrand);

router.post('/', authenticate, requireAdmin, createBrand);
router.put('/:id', authenticate, requireAdmin, updateBrand);
router.delete('/:id', authenticate, requireAdmin, deleteBrand);

module.exports = router;
