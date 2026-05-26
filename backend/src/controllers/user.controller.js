const UserModel = require('../models/User');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');
const prisma = require('../config/db');

// Admin: list all users
async function getAllUsers(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = {};
    if (req.query.role) where.role = req.query.role;
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { email: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take: limit, select: UserModel.userSelect, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: items, meta: buildPaginationMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllUsers };
