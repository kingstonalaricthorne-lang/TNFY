# TNYF

A full-stack e-commerce platform — Node.js/Express REST API backed by PostgreSQL + Redis, served alongside a static HTML/CSS/JS storefront and an admin dashboard.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML / CSS / JS (no build step) |
| Backend | Express 4, Prisma ORM 5, Node 18+ |
| Database | PostgreSQL (hosted on Railway) |
| Cache / Sessions | Redis (hosted on Upstash) |
| Auth | JWT (15 min access) + httpOnly refresh cookies (7 day, rotated) |
| Payments | Stripe Checkout |
| Images | AWS S3 presigned URLs |
| Email | Nodemailer + SendGrid |

## Repo layout

```
TNYF/
├── index.html, shop.html, product.html, ...   # Storefront pages
├── admin.html                                  # Admin dashboard
├── app.js, shop.js, product.js, dresses.js     # Per-page scripts
├── js/api.js                                   # Shared API client (auth, cart, etc.)
├── styles.css + per-page CSS
└── backend/
    ├── server.js, src/app.js                   # Entry + middleware
    ├── src/
    │   ├── config/        # db, redis, stripe, env (Zod-validated)
    │   ├── middleware/    # auth, admin, errorHandler, rateLimit, validate
    │   ├── models/        # Prisma DAOs (User, Product, Cart, Order, ...)
    │   ├── controllers/   # Route handlers
    │   ├── routes/        # Express routers
    │   ├── services/      # email, stripe, cache, discount
    │   └── utils/         # ApiError, generateToken, paginate, filterBuilder
    └── prisma/
        ├── schema.prisma  # 13-table data model
        └── seed.js        # Admin user + brands + categories + coupons
```

## Features

- **Auth** — register / login / logout / refresh / forgot password / reset password / verify email
- **Products** — dynamic SQL filtering by gender, category, brand, size, colour, price range, discount, tags, search
- **7 product collections** — `/featured`, `/trending`, `/new-in`, `/sale`, `/discount-zone`, `/search`, root listing
- **Cart** — guest carts via `sessionId`, authenticated carts, merge on login
- **Orders** — Stripe checkout, coupon discounts, status workflow (pending → confirmed → shipped → delivered)
- **Admin** — product CRUD with variants & images, coupon management, order management
- **Caching** — Redis-backed for product listings (2–10 min TTLs), invalidated on mutation

## Getting started

```bash
# 1) Install
cd backend
npm install

# 2) Configure
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, JWT_SECRET, Stripe/AWS/SendGrid keys

# 3) Migrate + seed
npx prisma db push
npm run prisma:seed

# 4) Run
npm run dev    # http://localhost:5000
```

Then open `http://localhost:5000/index.html` (storefront) or `http://localhost:5000/admin.html` (admin — default seed credentials: `admin@tnyf.com` / `Admin@1234`).

## Environment variables

See `backend/.env.example` for the full list. Required:

- `DATABASE_URL` — Postgres connection string (Railway / Neon / Supabase / local)
- `REDIS_URL` — Redis connection string (Upstash uses `rediss://` for TLS)
- `JWT_SECRET` — at least 32 chars
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`
- `SENDGRID_API_KEY`, `EMAIL_FROM`
- `CLIENT_URL`, `API_URL`

## License

Private — all rights reserved.
