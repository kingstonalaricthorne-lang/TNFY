# TNYF E-Commerce Backend — Complete Implementation Summary

## 1. Project Overview

**TNYF** is a complete Node.js/Express REST API backend for a women's fashion e-commerce platform. The backend implements:

- **User Authentication** — JWT with refresh token rotation, email verification, password reset
- **Product Catalog** — Dynamic SQL filtering, advanced searching, multiple collection endpoints
- **Shopping Cart** — Guest and authenticated cart management with session-based guest carts
- **Orders & Checkout** — Stripe integration, coupon discounts, order status management
- **User Profiles** — Personal data, addresses, order history
- **Admin Dashboard** — Product/order/user management, category/brand management
- **Caching** — Redis-based caching for product listings and frequent queries
- **Email Notifications** — SendGrid integration for transactional emails
- **Image Uploads** — AWS S3 presigned URLs for client-side uploads

**Tech Stack:**
- Express.js 4.19+ (Node 18+)
- PostgreSQL with Prisma ORM 5.15+
- Redis (ioredis 5.4+) for tokens, cache, blacklist
- JWT with httpOnly secure cookies for refresh tokens
- bcryptjs (12-round hashing) for passwords
- Stripe API for payments
- AWS S3 for image storage
- Nodemailer + SendGrid for emails
- Helmet, CORS, compression, rate limiting

---

## 2. Database Schema (Prisma)

**13 Tables:**

### Core Tables
- **User** — id, name, email, passwordHash, role (admin|customer), gender, phone, avatarUrl, isVerified, createdAt, updatedAt
- **Address** — id, userId, fullName, line1, line2, city, state, postcode, country, isDefault, createdAt
- **Product** — id, name, slug @unique, description, gender (mens|womens|unisex), basePrice, salePrice, discountPct, stockTotal, isActive, isNew, isFeatured, material, careInstructions, tags TEXT[], brandId, categoryId, createdAt, updatedAt
- **ProductVariant** — id, productId, size, color, colorHex, stockQty, sku, createdAt
- **ProductImage** — id, productId, url, altText, isPrimary, sortOrder, createdAt
- **Brand** — id, name @unique, slug @unique, description, logoUrl, createdAt
- **Category** — id, name, slug @unique, gender, parentId (nullable for tree structure), imageUrl, sortOrder, createdAt

### Commerce Tables
- **Cart** — id, userId (nullable for guests), sessionId (for guest carts), createdAt, updatedAt
- **CartItem** — id, cartId, variantId @unique per cart, quantity, addedAt
- **Order** — id, userId, addressId, status (pending|confirmed|processing|shipped|delivered|cancelled|refunded), paymentStatus (unpaid|paid|failed|refunded), subtotal, discountAmount, shippingFee, total, stripePiId, trackingNumber, couponId, createdAt, updatedAt
- **OrderItem** — id, orderId, variantId (nullable), productName (denormalized), size, color, quantity, unitPrice, totalPrice
- **Review** — id, productId_userId @unique, rating (1-5), title, body, isApproved, createdAt, updatedAt
- **Wishlist** — id, userId_productId @unique, addedAt
- **Coupon** — id, code @unique, type (percentage|fixed), value, minOrderValue, maxUses, usesCount, isActive, expiresAt, createdAt

---

## 3. Authentication & Authorization

### JWT Implementation
- **Single Secret** — `process.env.JWT_SECRET` (min 32 chars)
- **Access Token** — 15 minutes, embedded jti UUID for logout tracking
- **Refresh Token** — 7 days, stored in Redis (`refresh:{token}`), httpOnly secure cookie only (no body)
- **Cookie Settings** — httpOnly, secure (prod), sameSite, path=/api/auth, maxAge=7d

### Token Management
```javascript
// Access token: {userId, role, gender, jti, exp, iat}
// Refresh token: UUID stored in Redis with {userId, role}

// Logout: blacklist jti (Redis: blacklist:{jti}=1 until expiry)
// Refresh: rotate (revoke old, issue new pair)
```

### Middleware
- **authenticate** — Verifies Bearer token, checks blacklist, sets req.user
- **requireAdmin** — Checks req.user.role === 'admin'
- **Rate Limiting** — authLimiter (10 req/15min), strictLimiter (5 req/1hr), defaultLimiter (100 req/15min)

---

## 4. API Routes

### Authentication (`/api/auth`)
```
POST   /register          — Create account, issue tokens, send emails
POST   /login             — Verify credentials, issue tokens
POST   /logout            — Revoke refresh token, blacklist access token
POST   /refresh           — Rotate tokens via httpOnly cookie
GET    /me (auth)         — Current user profile
POST   /forgot-password   — Send password reset email (no enumeration)
POST   /reset-password    — Reset with token (single-use)
GET    /verify-email/:token — Verify email, redirect to client
```

### User Profile (`/api/me`, auth required)
```
GET    /                  — Get profile
PUT    /                  — Update profile (name, phone, gender, avatarUrl)
PUT    /password          — Change password (requires current)
GET    /addresses         — List all addresses
POST   /addresses         — Create new address
PUT    /addresses/:id     — Update address (ownership check)
DELETE /addresses/:id     — Delete address (ownership check)
PUT    /addresses/:id/default — Set as default
GET    /orders            — Paginated order history
GET    /orders/:id        — Order detail with items (ownership check)
```

### Products (`/api/products`)
```
GET    /featured          — Featured products (cache 10min)
GET    /trending          — Popular products by review count (cache 5min)
GET    /new-in            — New products (cache 5min)
GET    /sale              — On-sale products (cache 5min)
GET    /discount-zone     — 50%+ discount products (cache 5min)
GET    /search?q=...      — Full-text search (name, description, cache 2min)
GET    /                  — Root listing with filters (cache 2min)
GET    /:slug             — Single product by slug or UUID

POST   / (admin)          — Create product
PUT    /:id (admin)       — Update product
DELETE /:id (admin)       — Delete product
```

**Query Filters:** `gender`, `category` (slug), `brand` (slug), `minPrice`, `maxPrice`, `discount` (%), `size`, `color`, `tags` (comma/array), `sort` (newest|price_asc|price_desc|popular|discount), `page`, `limit`

### Cart (`/api/cart`)
```
GET    /                  — Get cart (auth user or ?sessionId=...)
POST   /items             — Add item {variantId, quantity}
PUT    /items/:id         — Update quantity (or delete if ≤0)
DELETE /items/:id         — Remove item
DELETE /                  — Clear cart
POST   /merge (auth)      — Merge guest ?sessionId into user cart
```

**Guest Support:** Pass `?sessionId=uuid` in query/body to manage unauthenticated carts. On login, call `/merge` to transfer guest cart items to authenticated user.

### Orders (`/api/orders`, auth required)
```
POST   /                  — Create order from cart
                           Body: {addressId?, couponCode?}
PATCH  /:id/cancel        — Cancel pending/confirmed order
GET    /admin/all (admin) — List all orders (status/userId/paymentStatus filters)
PATCH  /:id/status (admin) — Update order status/paymentStatus/trackingNumber
```

### Reviews (`/api/reviews`, auth for create)
```
GET    /products/:productId — Approved reviews, paginated, with avgRating
POST   /                  — Create review {productId, rating 1-5, title, body}
PUT    /:id (owner)       — Update review
DELETE /:id (owner)       — Delete review
```

### Wishlist (`/api/wishlist`, auth required)
```
GET    /                  — All wishlisted products
POST   /:productId        — Toggle wishlist (add/remove)
```

### Categories (`/api/categories`)
```
GET    /                  — All root categories (?gender filter)
GET    /:slug             — Category with children
POST   / (admin)          — Create category
PUT    /:id (admin)       — Update category
DELETE /:id (admin)       — Delete category
```

### Brands (`/api/brands`)
```
GET    /                  — All brands (cache 10min)
GET    /:slug             — Single brand
POST   / (admin)          — Create brand
PUT    /:id (admin)       — Update brand
DELETE /:id (admin)       — Delete brand
```

### Coupons (`/api/coupons`)
```
POST   /validate (auth)   — Validate coupon {code, subtotal} → {coupon, discount}
GET    / (admin)          — List all coupons
POST   / (admin)          — Create coupon
PUT    /:id (admin)       — Update coupon
DELETE /:id (admin)       — Delete coupon
```

### Uploads (`/api/uploads`, admin only)
```
POST   /presign           — Get S3 presigned URL {contentType, folder?}
DELETE /                  — Delete from S3 {key}
```

### Webhooks (`/api/webhooks`)
```
POST   /stripe            — Stripe webhook handler (raw body)
                           Handles: checkout.session.completed, payment_intent.payment_failed, charge.refunded
```

### Health
```
GET    /health            — Server status
```

---

## 5. Product Filtering (Dynamic SQL)

**Core Implementation:**
- `buildProductFilter(query)` → Prisma.sql WHERE fragment
- `buildProductOrderBy(sort)` → Prisma.sql ORDER BY fragment
- Both are safe (parameterized by Prisma), composable, and SQL-injected-proof

**Filter Logic:**

| Filter | SQL Clause |
|--------|-----------|
| `isActive` | `p.is_active = true` (default) |
| `gender` | `p.gender = ${value}` |
| `category` | `c.slug = ${value}` (via LEFT JOIN) |
| `brand` | `b.slug = ${value}` (via LEFT JOIN) |
| `minPrice` | `COALESCE(p.sale_price, p.base_price) >= ${value}` |
| `maxPrice` | `COALESCE(p.sale_price, p.base_price) <= ${value}` |
| `discount` | `p.discount_pct >= ${value} AND p.sale_price IS NOT NULL` |
| `size + color` | `EXISTS (SELECT 1 FROM product_variants WHERE ... AND size=${size} AND color=${color})` |
| `size` alone | `EXISTS (SELECT 1 FROM product_variants WHERE ... AND size=${size})` |
| `color` alone | `EXISTS (SELECT 1 FROM product_variants WHERE ... AND color=${color})` |
| `tags` | Single: `${tag} = ANY(p.tags)`; Multiple: `p.tags && ARRAY[...]` |
| `search` | `(p.name ILIKE ${term} OR p.description ILIKE ${term})` |

**Order By:**
- `newest` — `p.created_at DESC`
- `price_asc` — `COALESCE(p.sale_price, p.base_price) ASC`
- `price_desc` — `COALESCE(p.sale_price, p.base_price) DESC`
- `popular` — `COALESCE(rc.review_count, 0) DESC`
- `discount` — `p.discount_pct DESC NULLS LAST`

**Response Structure** (via Prisma.$queryRaw):
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid",
      "name": "...",
      "slug": "...",
      "basePrice": 150.00,
      "salePrice": 99.99,
      "discountPct": 33,
      "reviewCount": 42,
      "brand": { "id": "...", "name": "...", "slug": "..." },
      "category": { "id": "...", "name": "...", "slug": "..." },
      "images": [
        { "id": "...", "url": "...", "altText": "...", "isPrimary": true, "sortOrder": 0 }
      ]
    }
  ],
  "meta": {
    "total": 145,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 6. Cart Management

### Authenticated Cart
- User has at most one cart per `userId`
- Cart contains multiple `CartItem` records (variantId + quantity)
- Get via `/api/cart` or `/api/me/cart` (both same endpoint)

### Guest Cart
- Unauthenticated users identified by `sessionId` (UUID, client-generated)
- Pass `?sessionId=uuid` in query or request body
- No expiry enforced in DB; client manages session lifecycle
- Converted to authenticated cart on login via `/api/cart/merge`

### Cart Merge Flow
```
1. User browses as guest, adds items to cart (sessionId-based)
2. User logs in
3. Client calls POST /api/cart/merge {sessionId: "old-session-uuid"}
4. Backend finds guest cart, transfers items to user's authenticated cart
   - If user has no cart: converts guest cart to user cart
   - If user has cart: merges items (additive quantity if variant exists)
5. Guest cart deleted
6. Return merged cart with user's userId
```

### Session ID Management
- **Client Responsibility** — Generate UUID on first visit, store in localStorage/sessionStorage
- **Persistence** — Cart session can survive page refreshes if client maintains sessionId
- **Cleanup** — Optional: implement expiry via background job (not included)

---

## 7. Order Flow

### Create Order
```
POST /api/orders {addressId, couponCode}

1. Auth required (user must be logged in)
2. Validate cart not empty
3. Validate all variants exist, are active, have sufficient stock
4. Calculate subtotal from cart items (using effective price)
5. Validate & apply coupon if provided
6. Calculate shipping (free if subtotal - discount >= $100, else $9.95)
7. Create Order record with status='pending', paymentStatus='unpaid'
8. Create OrderItem records (denormalize productName, size, color, prices)
9. Decrement variant stock by quantity
10. Clear cart
11. Create Stripe checkout session
12. Send order confirmation email
13. Return order + Stripe checkoutUrl
```

### Checkout
- Client redirects to Stripe session.url
- Stripe redirects to successUrl or cancelUrl
- Backend receives Stripe webhook on payment completion

### Stripe Webhook
- `checkout.session.completed` → Order status='confirmed', paymentStatus='paid'
- `payment_intent.payment_failed` → paymentStatus='failed'
- `charge.refunded` → status='refunded', paymentStatus='refunded'

### Order Status Flow
```
pending → confirmed (on payment) → processing → shipped → delivered
       ↘ cancelled (before confirmation)
       ↘ refunded (after payment)
```

---

## 8. Caching Strategy

**Redis Key Namespaces:**

| Key | TTL | Cleared On |
|-----|-----|-----------|
| `products:list:{query}` | 2 min | Product create/update/delete |
| `products:featured:{query}` | 10 min | Product create/update/delete |
| `products:trending:{query}` | 5 min | Product create/update/delete |
| `products:new-in:{query}` | 5 min | Product create/update/delete |
| `products:sale:{query}` | 5 min | Product create/update/delete |
| `products:discount-zone:{query}` | 5 min | Product create/update/delete |
| `products:search:{term}:{filters}` | 2 min | Product create/update/delete |
| `brands:all` | 10 min | Brand create/update/delete |
| `categories:{gender}` | 10 min | Category create/update/delete |
| `refresh:{token}` | 7 days | Logout, token rotation |
| `blacklist:{jti}` | Token lifetime | Access token expiry |
| `reset:{token}` | 1 hour | Password reset (single-use) |
| `verify:{token}` | 24 hours | Email verification (single-use) |

**Cache Invalidation:**
- Product mutations invalidate pattern `products:*`
- Brand mutations invalidate `brands:*`
- Category mutations invalidate `categories:*`

---

## 9. Security Implementation

### Password Security
- Bcryptjs with 12 salt rounds
- Never return passwordHash in API responses
- userSelect object excludes passwordHash field

### Token Security
- JWT signed with single secret, verified on every auth request
- jti (UUID) embedded in access token for fine-grained revocation
- Refresh tokens NOT in JSON body; httpOnly cookies only
- Cookie settings: secure (prod), sameSite, path=/api/auth
- Blacklist checked on every authenticated request (Redis GET)

### Data Protection
- Email addresses forced to lowercase (consistent hashing)
- Ownership checks on cart items, addresses, orders
- Forgot password endpoint does not reveal if email is registered
- Reset tokens are single-use, deleted after use
- Verify tokens are single-use, deleted after use

### Input Validation
- Zod schema validation via middleware (not yet added — can be extended)
- Prisma $queryRaw with parameterized Prisma.sql (SQL injection proof)
- Rate limiting on auth (10 req/15min), reset endpoints (5 req/1hr)
- Helmet, CORS, compression for transport security

### Admin Role
- Stored as lowercase 'admin' in DB
- Checked via middleware requireAdmin
- Applied to CRUD endpoints and admin-only reports

---

## 10. File Structure

```
backend/
├── .env                           # Config (not in repo, use .env.example)
├── .env.example                   # Template for .env
├── .gitignore
├── package.json                   # Dependencies
├── server.js                       # Entry point
├── src/
│   ├── app.js                     # Express app setup
│   ├── config/
│   │   ├── db.js                  # Prisma client
│   │   ├── redis.js               # Redis client
│   │   ├── stripe.js              # Stripe client
│   │   └── env.js                 # Zod env validation
│   ├── middleware/
│   │   ├── auth.js                # authenticate middleware
│   │   ├── admin.js               # requireAdmin middleware
│   │   ├── errorHandler.js        # Global error handler
│   │   ├── rateLimit.js           # Rate limiters
│   │   └── validate.js            # Zod validation middleware (optional)
│   ├── models/                    # DAO/Repository layer
│   │   ├── User.js
│   │   ├── Product.js             # Uses raw SQL (Prisma.$queryRaw)
│   │   ├── ProductVariant.js
│   │   ├── ProductImage.js
│   │   ├── Cart.js                # Guest + user cart, merge logic
│   │   ├── CartItem.js
│   │   ├── Order.js
│   │   ├── OrderItem.js
│   │   ├── Review.js
│   │   ├── Wishlist.js
│   │   ├── Category.js
│   │   ├── Brand.js
│   │   ├── Address.js
│   │   └── Coupon.js
│   ├── controllers/
│   │   ├── auth.controller.js     # Register, login, logout, refresh, reset password
│   │   ├── me.controller.js       # Profile, addresses, orders
│   │   ├── product.controller.js  # Product listings (7 endpoints)
│   │   ├── cart.controller.js     # Cart CRUD + merge
│   │   ├── order.controller.js    # Order creation, cancellation, admin list
│   │   ├── review.controller.js   # Reviews CRUD
│   │   ├── wishlist.controller.js # Wishlist toggle
│   │   ├── category.controller.js # Category CRUD
│   │   ├── brand.controller.js    # Brand CRUD
│   │   ├── coupon.controller.js   # Coupon validation + admin CRUD
│   │   ├── user.controller.js     # Admin: list users
│   │   ├── upload.controller.js   # S3 presigned URLs
│   │   └── webhook.controller.js  # Stripe webhooks
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── me.routes.js
│   │   ├── product.routes.js
│   │   ├── cart.routes.js
│   │   ├── order.routes.js
│   │   ├── review.routes.js
│   │   ├── wishlist.routes.js
│   │   ├── category.routes.js
│   │   ├── brand.routes.js
│   │   ├── coupon.routes.js
│   │   ├── user.routes.js
│   │   ├── upload.routes.js
│   │   └── webhook.routes.js
│   ├── services/
│   │   ├── email.service.js       # Nodemailer + SendGrid
│   │   ├── stripe.service.js      # Stripe checkout & webhooks
│   │   ├── cache.service.js       # Redis cache helpers
│   │   └── discount.service.js    # Coupon validation & discount calc
│   └── utils/
│       ├── ApiError.js            # Custom error class
│       ├── generateToken.js       # JWT & refresh token utils
│       ├── paginate.js            # Pagination helpers
│       ├── filterBuilder.js       # Dynamic SQL WHERE/ORDER BY
│       └── upload.js              # S3 utilities (optional)
└── prisma/
    ├── schema.prisma              # Prisma data model
    └── seed.js                    # Database seeding
```

---

## 11. Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tnyf

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-secret-key-at-least-32-characters-long
JWT_ACCESS_EXPIRES_IN=15m

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS S3
AWS_REGION=ap-southeast-2
AWS_S3_BUCKET=tnyf-images
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Email (SendGrid)
SENDGRID_API_KEY=SG_...
EMAIL_FROM=noreply@tnyf.com
EMAIL_FROM_NAME=TNYF

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 12. Getting Started

### Setup
```bash
npm install
cp .env.example .env
# Edit .env with your config

npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### Development
```bash
npm run dev        # Start with nodemon
npm run prisma:studio  # Prisma Studio UI
npm run prisma:seed    # Re-run seed
```

### Production
```bash
npm run build      # If using TypeScript (not yet added)
npm start          # Run server.js
```

---

## 13. Testing Checklist

### Authentication
- [ ] Register with valid/invalid data
- [ ] Login with valid/invalid credentials
- [ ] Logout revokes refresh token and blacklists access token
- [ ] Refresh endpoint rotates tokens via httpOnly cookie
- [ ] Verify email link sets isVerified=true and expires after 24hr
- [ ] Forgot password sends email and expires after 1hr
- [ ] Reset password is single-use and enforces password requirements

### Products
- [ ] /featured, /trending, /new-in, /sale, /discount-zone endpoints return correct subsets
- [ ] /search with q < 2 chars returns empty result
- [ ] All filters work individually and combined
- [ ] Size+color constraint prevents false positives
- [ ] Tags array filtering works (single and multiple)
- [ ] Price range filters use effective price (sale_price ?? base_price)
- [ ] Pagination metadata is accurate
- [ ] Response includes brand, category, images, reviewCount

### Cart
- [ ] Authenticated user cart management (add/update/remove/clear)
- [ ] Guest session cart management (?sessionId query param)
- [ ] Cart merge on login (guest → user)
- [ ] Stock validation before adding item
- [ ] Quantity validation (delete if ≤0)

### Orders
- [ ] Create order from cart (validates cart, stock, coupon, calculates total)
- [ ] Stripe checkout session created and URL returned
- [ ] Coupon validation (expiry, usage limit, min order amount)
- [ ] Discount calculation (percentage vs fixed)
- [ ] Shipping fee ($9.95 or free if >= $100)
- [ ] Order items denormalize product/variant details
- [ ] Stock decremented after order creation
- [ ] Cart cleared after order creation
- [ ] Cancel order (pending/confirmed only)

### Admin
- [ ] List/create/update/delete products
- [ ] List/create/update/delete categories
- [ ] List/create/update/delete brands
- [ ] List/create/update/delete coupons
- [ ] List all users (with search/role filter)
- [ ] List all orders (with status/userId/paymentStatus filter)
- [ ] Update order status/paymentStatus/trackingNumber

### Caching
- [ ] Product endpoints return cached results on repeat requests
- [ ] Cache invalidated on product mutation
- [ ] Cache keys include query params

### Rate Limiting
- [ ] Auth endpoints (register/login) limited to 10 req/15min
- [ ] Reset endpoints limited to 5 req/1hr
- [ ] Default API limited to 100 req/15min

---

## 14. Known Limitations & Future Work

### Current
- No unit/integration tests
- No background email queue (fires synchronously)
- No image optimization
- No full-text search index (uses ILIKE)
- No order refund workflow
- No inventory management features
- No analytics/reporting endpoints

### Potential Enhancements
1. **Email Queue** — Bull/BullMQ for async email delivery
2. **Tests** — Jest + Supertest for unit/integration tests
3. **Search** — PostgreSQL tsvector + GIN index for full-text search
4. **Admin Dashboard** — Dedicated analytics endpoints
5. **Inventory** — Low stock warnings, backorder support
6. **Refunds** — Partial/full refund workflow
7. **API Documentation** — Swagger/OpenAPI spec
8. **GraphQL** — Apollo Server as alternative to REST
9. **Real-time** — WebSockets for notifications
10. **Logging** — Winston/Pino for structured logging

---

## 15. Deployment Checklist

- [ ] Set NODE_ENV=production
- [ ] Verify all env vars in production
- [ ] Run database migrations on production DB
- [ ] Configure Redis persistence
- [ ] Set up SSL/TLS (https)
- [ ] Enable CORS for production client domain
- [ ] Configure Stripe webhook URL
- [ ] Set up SendGrid verified sender domain
- [ ] Configure S3 bucket CORS and permissions
- [ ] Enable helmet security headers
- [ ] Set secure=true for refresh token cookies
- [ ] Use strong JWT_SECRET (min 32 chars)
- [ ] Enable rate limiting (adjust thresholds as needed)
- [ ] Set up error logging (Sentry, LogRocket, etc.)
- [ ] Configure database backups
- [ ] Monitor Redis memory usage

---

**Last Updated:** May 2026
**Version:** 1.0.0
**Status:** Production-Ready (Core Features Complete)
