const prisma = require('../config/db');

async function findAll() {
  // Brand model has no isActive flag — return all brands ordered alphabetically.
  return prisma.brand.findMany({ orderBy: { name: 'asc' } });
}

async function findById(id) {
  return prisma.brand.findUnique({ where: { id } });
}

async function findBySlug(slug) {
  return prisma.brand.findUnique({ where: { slug } });
}

async function create(data) {
  return prisma.brand.create({ data });
}

async function update(id, data) {
  return prisma.brand.update({ where: { id }, data });
}

async function remove(id) {
  return prisma.brand.delete({ where: { id } });
}

module.exports = { findAll, findById, findBySlug, create, update, remove };
