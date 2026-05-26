const prisma = require('../config/db');

async function findAll(gender) {
  // Always limit to root categories; children come back via include for tree rendering.
  const where = { parentId: null };
  if (gender) where.gender = gender;

  return prisma.category.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
    include: { children: { orderBy: { sortOrder: 'asc' } } },
  });
}

async function findById(id) {
  return prisma.category.findUnique({
    where: { id },
    include: { children: true, parent: true },
  });
}

async function findBySlug(slug) {
  return prisma.category.findUnique({
    where: { slug },
    include: { children: { orderBy: { sortOrder: 'asc' } } },
  });
}

async function create(data) {
  return prisma.category.create({ data });
}

async function update(id, data) {
  return prisma.category.update({ where: { id }, data });
}

async function remove(id) {
  return prisma.category.delete({ where: { id } });
}

module.exports = { findAll, findById, findBySlug, create, update, remove };
