const prisma = require('../config/db');

async function findByUser(userId) {
  return prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
}

async function findById(id) {
  return prisma.address.findUnique({ where: { id } });
}

async function create(userId, data) {
  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.address.create({ data: { ...data, userId } });
}

async function update(id, userId, data) {
  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.address.update({ where: { id }, data });
}

async function setDefault(id, userId) {
  await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  return prisma.address.update({ where: { id }, data: { isDefault: true } });
}

async function remove(id) {
  return prisma.address.delete({ where: { id } });
}

module.exports = { findByUser, findById, create, update, setDefault, remove };
