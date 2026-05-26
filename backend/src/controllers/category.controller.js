const CategoryModel = require('../models/Category');
const { getOrSet, invalidatePattern } = require('../services/cache.service');
const ApiError = require('../utils/ApiError');

async function getCategories(req, res, next) {
  try {
    const { gender } = req.query;
    const cacheKey = `categories:${gender || 'all'}`;
    const data = await getOrSet(cacheKey, () => CategoryModel.findAll(gender), 600);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getCategory(req, res, next) {
  try {
    const category = await CategoryModel.findBySlug(req.params.slug);
    if (!category) throw ApiError.notFound('Category not found');
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await CategoryModel.create(req.body);
    await invalidatePattern('categories:*');
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await CategoryModel.update(req.params.id, req.body);
    await invalidatePattern('categories:*');
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    await CategoryModel.remove(req.params.id);
    await invalidatePattern('categories:*');
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCategories, getCategory, createCategory, updateCategory, deleteCategory };
