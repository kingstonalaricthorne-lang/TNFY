const prisma = require('../config/db');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');

const orderInclude = {
  items: {
    include: {
      variant: {
        select: { id: true, size: true, color: true, sku: true },
      },
    },
  },
  address: true,
  coupon: { select: { id: true, code: true, type: true, value: true } },
};

async function findByUser(userId, query) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: orderInclude,
    }),
    prisma.order.count({ where: { userId } }),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function findById(id) {
  return prisma.order.findUnique({ where: { id }, include: orderInclude });
}

async function findAll(query) {
  const { page, limit, skip } = parsePagination(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.userId) where.userId = query.userId;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        ...orderInclude,
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function create(data) {
  return prisma.order.create({ data, include: orderInclude });
}

async function update(id, data) {
  return prisma.order.update({ where: { id }, data, include: orderInclude });
}

module.exports = { findByUser, findById, findAll, create, update };
