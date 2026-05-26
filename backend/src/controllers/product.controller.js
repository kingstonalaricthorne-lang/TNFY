const ProductModel = require('../models/Product');
const { getOrSet, invalidatePattern } = require('../services/cache.service');
const ApiError = require('../utils/ApiError');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Merge preset params with whatever pagination/sort the client sends
function preset(req, overrides) {
  return { ...req.query, ...overrides };
}

// ─── Listing endpoints ────────────────────────────────────────────────────────

async function getProducts(req, res, next) {
  try {
    const cacheKey = `products:list:${JSON.stringify(req.query)}`;
    const data = await getOrSet(cacheKey, () => ProductModel.findMany(req.query), 120);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

async function getFeatured(req, res, next) {
  try {
    const query = preset(req, { isFeatured: 'true', sort: req.query.sort || 'newest' });
    const cacheKey = `products:featured:${JSON.stringify(req.query)}`;
    const data = await getOrSet(cacheKey, () => ProductModel.findMany(query), 600);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

async function getTrending(req, res, next) {
  try {
    const query = preset(req, { sort: req.query.sort || 'popular' });
    const cacheKey = `products:trending:${JSON.stringify(req.query)}`;
    const data = await getOrSet(cacheKey, () => ProductModel.findMany(query), 300);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

async function getNewIn(req, res, next) {
  try {
    const query = preset(req, { isNew: 'true', sort: req.query.sort || 'newest' });
    const cacheKey = `products:new-in:${JSON.stringify(req.query)}`;
    const data = await getOrSet(cacheKey, () => ProductModel.findMany(query), 300);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

async function getSale(req, res, next) {
  try {
    const query = preset(req, { onSale: 'true', sort: req.query.sort || 'discount' });
    const cacheKey = `products:sale:${JSON.stringify(req.query)}`;
    const data = await getOrSet(cacheKey, () => ProductModel.findMany(query), 300);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

async function getDiscountZone(req, res, next) {
  try {
    // Discount zone = 50%+ off
    const query = preset(req, { discount: '50', sort: req.query.sort || 'discount' });
    const cacheKey = `products:discount-zone:${JSON.stringify(req.query)}`;
    const data = await getOrSet(cacheKey, () => ProductModel.findMany(query), 300);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

async function searchProducts(req, res, next) {
  try {
    const { q, ...rest } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        items: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0, hasNext: false, hasPrev: false },
      });
    }

    const term = q.trim();
    const query = { ...rest, search: term };
    const cacheKey = `products:search:${term.toLowerCase()}:${JSON.stringify(rest)}`;
    const data = await getOrSet(cacheKey, () => ProductModel.findMany(query), 120);
    res.json({ success: true, query: term, ...data });
  } catch (err) {
    next(err);
  }
}

// ─── Single product ───────────────────────────────────────────────────────────

async function getProduct(req, res, next) {
  try {
    const { slug } = req.params;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(slug);
    const product = isUUID
      ? await ProductModel.findById(slug)
      : await ProductModel.findBySlug(slug);

    if (!product) throw ApiError.notFound('Product not found');
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

async function createProduct(req, res, next) {
  try {
    const product = await ProductModel.create(req.body);
    await invalidatePattern('products:*');
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const product = await ProductModel.update(req.params.id, req.body);
    await invalidatePattern('products:*');
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    await ProductModel.remove(req.params.id);
    await invalidatePattern('products:*');
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
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
};
