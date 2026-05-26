const { Prisma } = require('@prisma/client');

/**
 * Builds a WHERE clause as a Prisma.sql fragment.
 * Safe to embed in $queryRaw tagged templates — Prisma handles parameterization.
 *
 * Supported params:
 *   gender, category (slug), brand (slug),
 *   minPrice, maxPrice, discount (min %), size, color,
 *   tags (string or array), search,
 *   onSale / isNew / isFeatured (internal preset flags)
 */
function buildProductFilter(query) {
  const f = [];

  // Always restrict to active products unless admin explicitly requests otherwise
  if (query.isActive !== 'false') {
    f.push(Prisma.sql`p.is_active = true`);
  }

  // ─── Catalog filters ────────────────────────────────────────────────────────
  if (query.gender) {
    f.push(Prisma.sql`p.gender = ${query.gender}`);
  }

  // Category and brand are resolved by slug via the always-present LEFT JOINs
  if (query.category) {
    f.push(Prisma.sql`c.slug = ${query.category}`);
  }
  if (query.brand) {
    f.push(Prisma.sql`b.slug = ${query.brand}`);
  }

  // ─── Price ──────────────────────────────────────────────────────────────────
  // Use effective price: sale_price when set, otherwise base_price
  if (query.minPrice) {
    f.push(Prisma.sql`COALESCE(p.sale_price, p.base_price) >= ${Number(query.minPrice)}`);
  }
  if (query.maxPrice) {
    f.push(Prisma.sql`COALESCE(p.sale_price, p.base_price) <= ${Number(query.maxPrice)}`);
  }

  // ─── Discount ───────────────────────────────────────────────────────────────
  if (query.discount) {
    f.push(Prisma.sql`p.discount_pct >= ${Number(query.discount)}`);
    f.push(Prisma.sql`p.sale_price IS NOT NULL`);
  }

  // ─── Variant-level: size and/or color ────────────────────────────────────────
  // When both are given, enforce that the SAME variant has both — avoids
  // the false positive where a product has (M, white) and (L, black) but
  // no (M, black) variant, yet both single-column EXISTS would be true.
  if (query.size && query.color) {
    f.push(Prisma.sql`EXISTS (
      SELECT 1 FROM product_variants pv
      WHERE pv.product_id = p.id
        AND pv.size  = ${query.size}
        AND pv.color = ${query.color}
    )`);
  } else {
    if (query.size) {
      f.push(Prisma.sql`EXISTS (
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = p.id AND pv.size = ${query.size}
      )`);
    }
    if (query.color) {
      f.push(Prisma.sql`EXISTS (
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = p.id AND pv.color = ${query.color}
      )`);
    }
  }

  // ─── Tags ───────────────────────────────────────────────────────────────────
  if (query.tags) {
    const arr = Array.isArray(query.tags) ? query.tags : [query.tags];
    if (arr.length === 1) {
      // Single tag: scalar = ANY(array_column)
      f.push(Prisma.sql`${arr[0]} = ANY(p.tags)`);
    } else {
      // Multiple tags: overlap operator (any of the given tags present)
      const tagLiterals = arr.map((t) => Prisma.sql`${t}`);
      f.push(Prisma.sql`p.tags && ARRAY[${Prisma.join(tagLiterals, ', ')}]::text[]`);
    }
  }

  // ─── Full-text search ────────────────────────────────────────────────────────
  if (query.search) {
    const term = `%${query.search}%`;
    f.push(Prisma.sql`(
      p.name        ILIKE ${term} OR
      p.description ILIKE ${term}
    )`);
  }

  // ─── Internal preset flags (used by /featured, /new-in, /sale etc.) ─────────
  if (query.onSale     === 'true') f.push(Prisma.sql`p.sale_price IS NOT NULL`);
  if (query.isNew      === 'true') f.push(Prisma.sql`p.is_new     = true`);
  if (query.isFeatured === 'true') f.push(Prisma.sql`p.is_featured = true`);

  return f.length ? Prisma.join(f, ' AND ') : Prisma.sql`1 = 1`;
}

/**
 * Returns an ORDER BY fragment.
 * Column/direction are whitelisted — never interpolated from raw user input.
 */
function buildProductOrderBy(sort) {
  const map = {
    newest:     Prisma.sql`p.created_at DESC`,
    price_asc:  Prisma.sql`COALESCE(p.sale_price, p.base_price) ASC`,
    price_desc: Prisma.sql`COALESCE(p.sale_price, p.base_price) DESC`,
    popular:    Prisma.sql`COALESCE(rc.review_count, 0) DESC`,
    discount:   Prisma.sql`p.discount_pct DESC NULLS LAST`,
  };
  return map[sort] || map.newest;
}

module.exports = { buildProductFilter, buildProductOrderBy };
