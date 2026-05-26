const BrandModel = require('../models/Brand');
const { getOrSet, invalidatePattern } = require('../services/cache.service');
const ApiError = require('../utils/ApiError');

async function getBrands(req, res, next) {
  try {
    const data = await getOrSet('brands:all', () => BrandModel.findAll(), 600);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getBrand(req, res, next) {
  try {
    const brand = await BrandModel.findBySlug(req.params.slug);
    if (!brand) throw ApiError.notFound('Brand not found');
    res.json({ success: true, data: brand });
  } catch (err) {
    next(err);
  }
}

async function createBrand(req, res, next) {
  try {
    const brand = await BrandModel.create(req.body);
    await invalidatePattern('brands:*');
    res.status(201).json({ success: true, data: brand });
  } catch (err) {
    next(err);
  }
}

async function updateBrand(req, res, next) {
  try {
    const brand = await BrandModel.update(req.params.id, req.body);
    await invalidatePattern('brands:*');
    res.json({ success: true, data: brand });
  } catch (err) {
    next(err);
  }
}

async function deleteBrand(req, res, next) {
  try {
    await BrandModel.remove(req.params.id);
    await invalidatePattern('brands:*');
    res.json({ success: true, message: 'Brand deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBrands, getBrand, createBrand, updateBrand, deleteBrand };
