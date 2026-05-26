const prisma = require('../config/db');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');

async function findByProduct(productId, query) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where: { productId, isApproved: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.review.count({ where: { productId, isApproved: true } }),
  ]);

  const avgResult = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
  });

  return {
    items,
    meta: buildPaginationMeta(total, page, limit),
    averageRating: avgResult._avg.rating || 0,
  };
}

async function create(data) {
  return prisma.review.create({
    data,
    include: { user: { select: { id: true, name: true } } },
  });
}

async function update(id, data) {
  return prisma.review.update({ where: { id }, data });
}

async function remove(id) {
  return prisma.review.delete({ where: { id } });
}

async function findByUserAndProduct(userId, productId) {
  return prisma.review.findUnique({ where: { productId_userId: { productId, userId } } });
}

module.exports = { findByProduct, create, update, remove, findByUserAndProduct };
