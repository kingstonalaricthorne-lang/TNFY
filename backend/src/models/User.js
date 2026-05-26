const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  gender: true,
  phone: true,
  avatarUrl: true,
  isVerified: true,
  createdAt: true,
};

async function findById(id) {
  return prisma.user.findUnique({ where: { id }, select: userSelect });
}

async function findByEmail(email) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

async function create({ email, password, name, phone, gender }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash, name, phone, gender },
    select: userSelect,
  });
}

async function update(id, data) {
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    delete data.password;
  }
  return prisma.user.update({ where: { id }, data, select: userSelect });
}

async function verifyPassword(plainText, hash) {
  return bcrypt.compare(plainText, hash);
}

module.exports = { findById, findByEmail, create, update, verifyPassword, userSelect };
