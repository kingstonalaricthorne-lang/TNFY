const ReviewModel = require('../models/Review');
const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');

// Verify the review exists and is owned by the requesting user (admin override allowed).
async function ensureOwnership(reviewId, user) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true },
  });
  if (!review) throw ApiError.notFound('Review not found');
  if (review.userId !== user.userId && user.role !== 'admin') {
    throw ApiError.forbidden('You do not own this review');
  }
  return review;
}

async function getProductReviews(req, res, next) {
  try {
    const result = await ReviewModel.findByProduct(req.params.productId, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function createReview(req, res, next) {
  try {
    const { productId, rating, title, body } = req.body;
    const userId = req.user.userId;

    if (!productId || !rating) throw ApiError.badRequest('productId and rating are required');
    if (rating < 1 || rating > 5) throw ApiError.badRequest('Rating must be between 1 and 5');

    const existing = await ReviewModel.findByUserAndProduct(userId, productId);
    if (existing) throw ApiError.conflict('You have already reviewed this product');

    const review = await ReviewModel.create({ userId, productId, rating, title, body });
    res.status(201).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
}

async function updateReview(req, res, next) {
  try {
    await ensureOwnership(req.params.id, req.user);

    const { rating, title, body } = req.body;
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw ApiError.badRequest('Rating must be between 1 and 5');
    }

    const review = await ReviewModel.update(req.params.id, { rating, title, body });
    res.json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
}

async function deleteReview(req, res, next) {
  try {
    await ensureOwnership(req.params.id, req.user);
    await ReviewModel.remove(req.params.id);
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProductReviews, createReview, updateReview, deleteReview };
