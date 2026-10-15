# Droply — Launch. Sell. Know the Demand.

A full-stack product drop and demand validation platform. Allows businesses to create temporary product drops, share links, collect orders, and see real demand data before committing to stock.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, TypeScript, Express |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT tokens |
| File Storage | Local filesystem (easily swapped for S3) |

---

## Prerequisites

- Node.js 18+
- PostgreSQL (running locally or via Docker)

---

## Quick Setup

### 1. Database

Create a PostgreSQL database:

```sql
CREATE DATABASE droply;
```

### 2. Backend

```bash
cd backend

# Copy and edit environment variables
cp .env.example .env
# Edit .env — set your DATABASE_URL

# Install dependencies (already done)
npm install

# Push schema to database
npx prisma db push

# Seed with demo data
npm run seed
```

### 3. Frontend

```bash
cd frontend
npm install  # already done
```

### 4. Run both servers

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

---

## Access

| URL | Description |
|-----|-------------|
| http://localhost:5173 | Public landing page |
| http://localhost:5173/drop/weekend-food-drop | Demo drop page |
| http://localhost:5173/admin | Admin dashboard |
| http://localhost:5173/admin/login | Admin login |

**Admin credentials:**
- Email: `admin@droply.co`
- Password: `admin123`

---

## End-to-End Flow

### Admin
1. Login at `/admin/login`
2. Create products at `/admin/products`
3. Create a drop at `/admin/drops/new`
4. Copy the generated drop link
5. Share on WhatsApp/Instagram/etc.

### Customer
1. Open drop link (e.g. `/drop/weekend-food-drop`)
2. Select products and quantities
3. Tap "Continue to Checkout"
4. Enter details, choose delivery/collection
5. Pay via EFT (upload POP) or Cash on Delivery
6. Receive order confirmation

### Admin — After Orders
1. View orders at `/admin/orders`
2. Open order → view POP → Verify or Reject
3. Update order status (Confirmed → Preparing → Ready → Completed)
4. See demand per product on the Dashboard
5. Export orders as CSV
6. Close the drop when done

---

## Project Structure

```
droply/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── src/
│   │   ├── lib/                # Prisma, JWT, storage, utilities
│   │   ├── middleware/         # Auth, error handling
│   │   ├── routes/             # API routes
│   │   ├── app.ts              # Express app
│   │   ├── index.ts            # Server entry
│   │   └── seed.ts             # Demo data
│   └── uploads/                # Local file storage
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/             # Reusable UI components
│       │   └── layout/         # Admin layout, protected routes
│       ├── pages/
│       │   ├── public/         # Landing, drop, checkout, success
│       │   └── admin/          # Dashboard, products, drops, orders, settings
│       ├── lib/                # API client, auth, formatters
│       ├── hooks/              # useAuth
│       └── types/              # TypeScript interfaces
└── README.md
```

---

## API Endpoints

### Public
- `GET /api/drops/public/:slug` — Get drop page data
- `POST /api/orders` — Place order
- `POST /api/orders/:id/upload-pop` — Upload proof of payment
- `GET /api/orders/number/:orderNumber` — Order confirmation
- `GET /api/settings` — Business settings (for checkout page)

### Admin (JWT required)
- `POST /api/auth/login` — Login
- `GET /api/dashboard` — Dashboard stats
- `GET/POST/PUT/DELETE /api/products` — Product management
- `GET/POST/PUT/DELETE /api/drops` — Drop management
- `POST /api/drops/:id/close` — Close drop
- `POST /api/drops/:id/duplicate` — Duplicate drop
- `GET /api/drops/:id/demand` — Demand summary
- `GET/PATCH /api/orders` — Order management
- `PATCH /api/orders/:id/payment-status` — Verify/reject payment
- `PATCH /api/orders/:id/order-status` — Update order status
- `GET /api/orders/export/:dropId` — Export CSV
- `GET/PUT /api/settings` — Business settings

---

## Security Notes

- All order totals are calculated server-side
- Product prices are verified against the database on checkout
- Drop open/close times are enforced on the backend
- File uploads are validated for type and size (10MB max)
- Admin routes are protected with JWT middleware
- Passwords are hashed with bcrypt (12 rounds)
- Customer data is never exposed on public order lookup beyond what's needed
