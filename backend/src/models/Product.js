const prisma = require('../config/db');
const { Prisma } = require('@prisma/client');
const { buildProductFilter, buildProductOrderBy } = require('../utils/filterBuilder');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');

// ─── Dynamic filtering with raw SQL ──────────────────────────────────────────

/**
 * Product listing with dynamic filtering, sorting, pagination.
 * Uses Prisma.sql for safe parameterization of complex filters:
 *   COALESCE(price), CASE/WHEN, EXISTS subqueries, ARRAY operators, LATERAL joins.
 */
async function findMany(query) {
  const { page, limit, skip } = parsePagination(query);
  const where = buildProductFilter(query);
  const orderBy = buildProductOrderBy(query.sort);

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        p.id,
        p.name,
        p.slug,
        p.description,
        p.gender,
        p.base_price::float8           AS "basePrice",
        p.sale_price::float8           AS "salePrice",
        p.discount_pct                 AS "discountPct",
        p.stock_total                  AS "stockTotal",
        p.is_active                    AS "isActive",
        p.is_featured                  AS "isFeatured",
        p.is_new                       AS "isNew",
        p.tags,
        p.material,
        p.care_instructions            AS "careInstructions",
        p.created_at                   AS "createdAt",
        p.updated_at                   AS "updatedAt",
        CASE WHEN b.id IS NOT NULL THEN
          json_build_object('id', b.id, 'name', b.name, 'slug', b.slug)
        END                            AS brand,
        CASE WHEN c.id IS NOT NULL THEN
          json_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
        END                            AS category,
        img.images,
        COALESCE(rc.review_count, 0)::int AS "reviewCount"
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id',        pi.id,
              'url',       pi.url,
              'altText',   pi.alt_text,
              'isPrimary', pi.is_primary
            )
            ORDER BY pi.is_primary DESC, pi.sort_order
          ),
          '[]'::json
        ) AS images
        FROM product_images pi
        WHERE pi.product_id = p.id
      ) img ON true
      LEFT JOIN (
        SELECT product_id, COUNT(*)::int AS review_count
        FROM reviews
        WHERE is_approved = true
        GROUP BY product_id
      ) rc ON rc.product_id = p.id
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${limit}
      OFFSET ${skip}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${buildProductFilter(query)}
    `,
  ]);

  const total = Number(countRows[0].count);
  return { items: rows, meta: buildPaginationMeta(total, page, limit) };
}

// ─── Single product (Prisma ORM) ────────────────────────────────────────────

const productInclude = {
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  variants: true,
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
  _count: { select: { reviews: true } },
};

async function findById(id) {
  return prisma.product.findUnique({ where: { id }, include: productInclude });
}

async function findBySlug(slug) {
  return prisma.product.findUnique({ where: { slug }, include: productInclude });
}

async function create(data) {
  return prisma.product.create({ data, include: productInclude });
}

async function update(id, data) {
  return prisma.product.update({ where: { id }, data, include: productInclude });
}

async function remove(id) {
  return prisma.product.delete({ where: { id } });
}

module.exports = { findMany, findById, findBySlug, create, update, remove };
