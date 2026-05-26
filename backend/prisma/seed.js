const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tnyf.com' },
    update: {},
    create: {
      email: 'admin@tnyf.com',
      passwordHash: await bcrypt.hash('Admin@1234', 12),
      name: 'TNYF Admin',
      role: 'admin',
      isVerified: true,
    },
  });
  console.log('Admin:', admin.email);

  // Brands
  const brandsData = [
    { name: 'Aje', slug: 'aje', description: 'Contemporary Australian fashion' },
    { name: 'Zimmermann', slug: 'zimmermann', description: 'Luxury Australian womenswear' },
    { name: 'Scanlan Theodore', slug: 'scanlan-theodore' },
    { name: 'Manning Cartell', slug: 'manning-cartell' },
    { name: 'Bec + Bridge', slug: 'bec-bridge' },
  ];
  for (const b of brandsData) {
    await prisma.brand.upsert({ where: { slug: b.slug }, update: {}, create: b });
  }
  console.log('Brands seeded');

  // Categories (with gender)
  const womensTop = await prisma.category.upsert({
    where: { slug: 'womens' },
    update: {},
    create: { name: 'Womens', slug: 'womens', gender: 'womens', sortOrder: 1 },
  });
  const mensTop = await prisma.category.upsert({
    where: { slug: 'mens' },
    update: {},
    create: { name: 'Mens', slug: 'mens', gender: 'mens', sortOrder: 2 },
  });

  const womensSubs = [
    { name: 'Dresses', slug: 'dresses', gender: 'womens', sortOrder: 1 },
    { name: 'Tops', slug: 'tops', gender: 'womens', sortOrder: 2 },
    { name: 'Bottoms', slug: 'bottoms', gender: 'womens', sortOrder: 3 },
    { name: 'Outerwear', slug: 'outerwear', gender: 'womens', sortOrder: 4 },
    { name: 'Sets', slug: 'sets-womens', gender: 'womens', sortOrder: 5 },
  ];
  for (const c of womensSubs) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, parentId: womensTop.id },
    });
  }

  const mensSubs = [
    { name: 'T-Shirts', slug: 'tshirts', gender: 'mens', sortOrder: 1 },
    { name: 'Shirts', slug: 'shirts', gender: 'mens', sortOrder: 2 },
    { name: 'Trousers', slug: 'trousers', gender: 'mens', sortOrder: 3 },
  ];
  for (const c of mensSubs) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, parentId: mensTop.id },
    });
  }
  console.log('Categories seeded');

  // Coupons
  await prisma.coupon.upsert({
    where: { code: 'EXTRA10' },
    update: {},
    create: {
      code: 'EXTRA10',
      type: 'percentage',
      value: 10,
      minOrderValue: 50,
      isActive: true,
    },
  });
  await prisma.coupon.upsert({
    where: { code: 'WELCOME20' },
    update: {},
    create: {
      code: 'WELCOME20',
      type: 'fixed',
      value: 20,
      minOrderValue: 100,
      maxUses: 1000,
      isActive: true,
    },
  });
  console.log('Coupons seeded');

  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
