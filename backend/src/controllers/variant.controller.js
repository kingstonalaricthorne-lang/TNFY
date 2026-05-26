const VariantModel = require('../models/ProductVariant');
const ImageModel = require('../models/ProductImage');
const ApiError = require('../utils/ApiError');
const { invalidatePattern } = require('../services/cache.service');

// Variants
async function getVariants(req, res, next) {
  try {
    const variants = await VariantModel.findByProduct(req.params.productId);
    res.json({ success: true, data: variants });
  } catch (err) {
    next(err);
  }
}

async function createVariant(req, res, next) {
  try {
    const variant = await VariantModel.create(req.params.productId, req.body);
    await invalidatePattern('products:*');
    res.status(201).json({ success: true, data: variant });
  } catch (err) {
    next(err);
  }
}

async function updateVariant(req, res, next) {
  try {
    const variant = await VariantModel.update(req.params.variantId, req.body);
    await invalidatePattern('products:*');
    res.json({ success: true, data: variant });
  } catch (err) {
    next(err);
  }
}

async function deleteVariant(req, res, next) {
  try {
    await VariantModel.remove(req.params.variantId);
    await invalidatePattern('products:*');
    res.json({ success: true, message: 'Variant deleted' });
  } catch (err) {
    next(err);
  }
}

// Images
async function getImages(req, res, next) {
  try {
    const images = await ImageModel.findByProduct(req.params.productId);
    res.json({ success: true, data: images });
  } catch (err) {
    next(err);
  }
}

async function createImage(req, res, next) {
  try {
    const image = await ImageModel.create(req.params.productId, req.body);
    await invalidatePattern('products:*');
    res.status(201).json({ success: true, data: image });
  } catch (err) {
    next(err);
  }
}

async function updateImage(req, res, next) {
  try {
    const image = await ImageModel.update(req.params.imageId, req.body);
    await invalidatePattern('products:*');
    res.json({ success: true, data: image });
  } catch (err) {
    next(err);
  }
}

async function deleteImage(req, res, next) {
  try {
    await ImageModel.remove(req.params.imageId);
    await invalidatePattern('products:*');
    res.json({ success: true, message: 'Image deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getVariants, createVariant, updateVariant, deleteVariant,
  getImages, createImage, updateImage, deleteImage,
};
