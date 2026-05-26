const prisma = require('../config/db');

async function findAll() {
  return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
}

async function findById(id) {
  return prisma.coupon.findUnique({ where: { id } });
}

async function findByCode(code) {
  return prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
}

async function create(data) {
  return prisma.coupon.create({ data: { ...data, code: data.code.toUpperCase() } });
}

async function update(id, data) {
  return prisma.coupon.update({ where: { id }, data });
}

async function remove(id) {
  return prisma.coupon.delete({ where: { id } });
}

module.exports = { findAll, findById, findByCode, create, update, remove };
