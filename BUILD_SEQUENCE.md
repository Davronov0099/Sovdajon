# Sardorbek Furnitura — Qurish Ketma-ketligi (Build Sequence)

> 0 dan to'liq ishga tushguncha. Har bir qadam buyruqlar bilan.
> Faza 1 dan boshlang — har bir step ni ketma-ket bajaring.

---

## PRE-REQUISITES (Kompyuterda bo'lishi kerak)

```bash
# 1. Node.js 20 LTS
node -v  # v20.x.x bo'lishi kerak

# 2. pnpm
npm install -g pnpm@latest
pnpm -v  # 9.x+

# 3. PostgreSQL 16
psql --version

# 4. Redis 7
redis-cli ping  # PONG

# 5. Git
git --version
```

**Agar PostgreSQL/Redis local da yo'q bo'lsa — Docker bilan:**
```bash
# Dev uchun PostgreSQL + Redis (faqat local)
docker compose up -d
```

---

## FAZA 1: Asos + Design System

### STEP 1.1 — Monorepo Scaffolding

```bash
cd c:/Users/ozodb/Desktop/loyihalar/Sardorbek_mebel

# Git init
git init
echo "node_modules\ndist\n.env\n*.log\nuploads/" > .gitignore

# pnpm workspace
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "packages/*"
  - "apps/*"
EOF

# Root package.json
pnpm init
```

**Qadam tartib:**
1. `pnpm-workspace.yaml` yaratish
2. Root `package.json` — scripts: lint, typecheck, test, build
3. Root `tsconfig.base.json` — strict mode, path aliases
4. `.eslintrc.cjs` — TypeScript + React rules
5. `.prettierrc` — formatting rules
6. `.editorconfig`
7. `.env.example` — barcha env keylar template

### STEP 1.2 — Shared Package

```
packages/shared/
├── package.json         # @sardorbek/shared
├── tsconfig.json        # extends root
└── src/
    ├── index.ts         # barrel export
    ├── types/
    │   ├── user.ts      # User, Role enums
    │   ├── product.ts   # Product, Category
    │   ├── receipt.ts   # Receipt, ReceiptItem, PaymentMethod
    │   ├── debt.ts      # Debt, DebtStatus
    │   ├── common.ts    # Pagination, ApiResponse, ErrorResponse
    │   └── index.ts
    ├── validation/
    │   ├── auth.ts      # loginSchema, registerSchema
    │   ├── product.ts   # productSchema, categorySchema
    │   ├── receipt.ts   # receiptSchema
    │   ├── common.ts    # phoneSchema, paginationSchema
    │   └── index.ts
    ├── constants/
    │   ├── roles.ts     # ROLES, PERMISSIONS
    │   ├── errors.ts    # ERROR_CODES
    │   ├── status.ts    # DEBT_STATUS, ORDER_STATUS ...
    │   └── index.ts
    └── utils/
        ├── format.ts    # formatCurrency, formatDate, formatPhone
        ├── calculate.ts # calculateDiscount, calculateProfit
        └── index.ts
```

**Tartib:**
1. `pnpm init` → `@sardorbek/shared`
2. `tsconfig.json` yaratish
3. `types/` — interfeys + enum lar
4. `validation/` — Zod schemalar (FE/BE shared)
5. `constants/` — ERROR_CODES, ROLES, statuslar
6. `utils/` — formatter + calculator funksiyalar
7. `pnpm build` — tekshirish

### STEP 1.3 — Backend (Fastify) Scaffold

```
apps/api/
├── package.json         # @sardorbek/api
├── tsconfig.json
└── src/
    ├── app.ts           # Fastify app factory
    ├── server.ts        # Entry point — listen
    ├── config/
    │   ├── env.ts       # Zod env validation
    │   ├── database.ts  # Prisma client singleton
    │   └── redis.ts     # Redis client (ioredis)
    ├── plugins/
    │   ├── auth.ts      # JWT verify + user attach
    │   ├── rbac.ts      # Role guard (requireRole)
    │   ├── validate.ts  # Zod request validation
    │   ├── error.ts     # Global error handler (AppError → JSON)
    │   └── rateLimit.ts # @fastify/rate-limit config
    ├── utils/
    │   ├── errors.ts    # AppError class + ERROR_CODES
    │   ├── auditLog.ts  # AuditLog utility
    │   └── atomicStock.ts # prisma atomic increment/decrement
    ├── modules/
    │   └── auth/
    │       ├── auth.routes.ts
    │       ├── auth.handler.ts
    │       └── auth.service.ts
    └── websocket/
        └── index.ts     # Socket.IO setup (Redis adapter)
```

**Tartib:**
1. `pnpm init` → `@sardorbek/api`
2. Dependencies install:
   ```bash
   pnpm --filter @sardorbek/api add fastify @fastify/cors @fastify/helmet @fastify/rate-limit @fastify/cookie @fastify/multipart
   pnpm --filter @sardorbek/api add @prisma/client ioredis jsonwebtoken bcrypt socket.io pino
   pnpm --filter @sardorbek/api add -D prisma typescript @types/node @types/jsonwebtoken @types/bcrypt tsx
   ```
3. `config/env.ts` — Zod bilan env validation
4. `config/database.ts` — Prisma client singleton
5. `config/redis.ts` — ioredis connect
6. `app.ts` — Fastify factory (register plugins, routes)
7. `server.ts` — app.listen + graceful shutdown
8. `plugins/` — auth, rbac, validate, error, rateLimit
9. `utils/errors.ts` — AppError + ERROR_CODES
10. `utils/auditLog.ts` — log utility
11. `utils/atomicStock.ts` — atomic stock ops

### STEP 1.4 — Prisma Schema (Initial)

```bash
cd apps/api
pnpm prisma init
```

```
prisma/
├── schema.prisma        # User, Setting + enums
├── seed.ts              # Admin user + default settings
└── migrations/          # Auto-generated
```

**Tartib:**
1. `schema.prisma` — datasource, generator
2. User model + Role enum
3. Setting model (key-value)
4. AuditLog model
5. `prisma migrate dev --name init`
6. `seed.ts` — default admin + settings
7. `prisma db seed`

### STEP 1.5 — Auth Module

**Backend (apps/api/src/modules/auth/):**
1. `auth.service.ts`:
   - `login(login, password)` → access + refresh tokens
   - `refresh(refreshToken)` → yangi token pair + rotation
   - `logout(userId, refreshToken)` → Redis blacklist
   - `me(userId)` → user data
2. `auth.handler.ts` — Fastify request/reply
3. `auth.routes.ts` — POST /login, POST /refresh, POST /logout, GET /me

**Test:**
- `POST /api/v1/auth/login` → 200 + tokens
- `POST /api/v1/auth/login` wrong password → 401
- `GET /api/v1/auth/me` + valid token → 200
- `GET /api/v1/auth/me` + expired token → 401

### STEP 1.6 — Frontend Scaffold

```bash
cd apps/web
pnpm create vite . --template react-ts
```

```
apps/web/
├── package.json         # @sardorbek/web
├── tsconfig.json
├── vite.config.ts       # Proxy, aliases
├── tailwind.config.ts   # Design tokens
├── index.html
└── src/
    ├── main.tsx         # Entry — providers
    ├── app/
    │   ├── providers.tsx    # QueryClient, Router, i18n
    │   ├── router.tsx       # TanStack Router setup
    │   └── guards.tsx       # AuthGuard, RoleGuard
    ├── components/
    │   ├── ui/              # Shadcn (Button, Input, Dialog, Sheet...)
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   ├── Header.tsx
    │   │   ├── MobileBottomNav.tsx
    │   │   └── AppLayout.tsx
    │   └── common/
    │       ├── StatusBadge.tsx
    │       ├── StatCard.tsx
    │       ├── EmptyState.tsx
    │       ├── SkeletonCard.tsx
    │       ├── ConfirmDialog.tsx
    │       ├── BottomSheet.tsx
    │       ├── SearchInput.tsx
    │       ├── MoneyInput.tsx
    │       ├── PhoneInput.tsx
    │       ├── PageWrapper.tsx
    │       ├── CommandPalette.tsx
    │       └── ErrorBoundary.tsx
    ├── features/
    │   └── auth/
    │       └── LoginPage.tsx
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useKeyboardShortcut.ts
    │   └── useDebounce.ts
    ├── stores/
    │   ├── authStore.ts
    │   ├── cartStore.ts
    │   ├── themeStore.ts
    │   ├── soundStore.ts
    │   ├── offlineStore.ts
    │   └── uiStore.ts
    ├── services/
    │   ├── api.ts           # ky instance
    │   └── socket.ts        # Socket.IO client
    ├── i18n/
    │   ├── config.ts
    │   ├── uz.json
    │   ├── en.json
    │   └── ru.json
    └── lib/
        └── sounds.ts        # Web Audio API wrapper
```

**Tartib:**
1. Vite + React 19 + TypeScript scaffold
2. Dependencies:
   ```bash
   pnpm --filter @sardorbek/web add react react-dom
   pnpm --filter @sardorbek/web add @tanstack/react-router @tanstack/react-query
   pnpm --filter @sardorbek/web add zustand ky socket.io-client
   pnpm --filter @sardorbek/web add react-hook-form @hookform/resolvers zod
   pnpm --filter @sardorbek/web add react-i18next i18next
   pnpm --filter @sardorbek/web add motion sonner
   pnpm --filter @sardorbek/web add -D tailwindcss @tailwindcss/vite
   ```
3. `tailwind.config.ts` — design tokens (ranglar, spacing, shadows)
4. Shadcn/ui init + core components
5. `services/api.ts` — ky instance (baseURL, interceptors, token refresh)
6. `stores/` — 6 ta Zustand store
7. `app/router.tsx` — TanStack Router + lazy routes
8. `app/providers.tsx` — QueryClientProvider, RouterProvider
9. `app/guards.tsx` — AuthGuard (redirect to /login)
10. `components/layout/` — Sidebar, Header, MobileBottomNav, AppLayout
11. `components/common/` — 12 ta core component
12. `features/auth/LoginPage.tsx` — login form
13. `hooks/` — useAuth, useKeyboardShortcut, useDebounce
14. `i18n/` — 3 til JSON + config
15. `lib/sounds.ts` — Web Audio wrapper
16. `services/socket.ts` — Socket.IO client

### STEP 1.7 — Test Infrastructure

```bash
# Backend test deps
pnpm --filter @sardorbek/api add -D vitest @faker-js/faker

# Frontend test deps
pnpm --filter @sardorbek/web add -D vitest @testing-library/react @testing-library/jest-dom jsdom msw

# E2E
pnpm add -Dw @playwright/test
npx playwright install chromium firefox webkit
```

**Tartib:**
1. `vitest.config.ts` (root) — workspace config
2. `apps/api/vitest.config.ts` — test DB, setup
3. `apps/web/vitest.config.ts` — jsdom, setup
4. `tests/setup.ts` — DB truncate, token helpers
5. `tests/factories/` — user, product factory skelet
6. `tests/mocks/handlers.ts` — MSW handlers
7. `tests/mocks/server.ts` — MSW server
8. `playwright.config.ts` — Chrome + Firefox + mobile Safari
9. `.env.test` — test DB URL
10. Unit test yozish: Zod schemas, utils, stores

### STEP 1.8 — CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request]
jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit

  integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: sardorbek_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @sardorbek/api prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/sardorbek_test
      - run: pnpm test:integration
```

### STEP 1.9 — Dev Environment Verify

```bash
# Root dan barchasini ishga tushirish
pnpm install
pnpm --filter @sardorbek/shared build

# DB yaratish
cd apps/api
cp .env.example .env   # PostgreSQL + Redis URL to'ldirish
pnpm prisma migrate dev --name init
pnpm prisma db seed

# Backend ishga tushirish
pnpm dev  # localhost:3000

# Frontend ishga tushirish (yangi terminal)
cd apps/web
pnpm dev  # localhost:5173

# Tekshirish
# 1. http://localhost:5173 → Login sahifa
# 2. admin / admin1234 → Dashboard
# 3. Sidebar, Header ko'rinishi
```

### FAZA 1 TUGAGANDA CHECKLIST:
- [ ] `pnpm lint` — 0 xato
- [ ] `pnpm typecheck` — 0 xato
- [ ] `pnpm test:unit` — Zod, utils, stores testlar o'tadi
- [ ] Login → Dashboard → Sidebar ishlaydi
- [ ] Mobile responsive (375px) da to'g'ri ko'rinadi
- [ ] Keyboard shortcut (Ctrl+K) ishlaydi
- [ ] i18n til almashtirish ishlaydi
- [ ] Socket.IO connect bo'ladi (devtools Network WS)

---

## FAZA 2: Mahsulotlar va Kategoriyalar

### STEP 2.1 — Prisma Schema Extension

```
Yangi modellar:
- Category (id, name, icon, order, parentId?)
- SubCategory (id, name, categoryId)
- Product (id, name, sku, barcode, price, costPrice, stock, unit, categoryId, subCategoryId?, images, isDeleted, deletedAt)
- PriceHistory (id, productId, oldPrice, newPrice, reason, createdById)
```

**Tartib:**
1. `schema.prisma` ga modellar qo'shish
2. `prisma migrate dev --name add-products`
3. Shared package ga yangi types + schemas qo'shish
4. Factory: `createProduct()`, `createCategory()`

### STEP 2.2 — Backend: Product + Category CRUD

```
modules/product/
├── product.routes.ts    # CRUD + search + import
├── product.handler.ts
└── product.service.ts   # Image upload, QR generate, price history

modules/category/
├── category.routes.ts   # CRUD + reorder
├── category.handler.ts
└── category.service.ts  # DnD order update
```

**API Endpoints:**
1. `GET /products` — paginated, search, filter by category
2. `GET /products/:id`
3. `POST /products` — create + image upload
4. `PATCH /products/:id` — update
5. `DELETE /products/:id` — soft delete
6. `GET /categories` — tree structure
7. `POST /categories` — create
8. `PATCH /categories/reorder` — DnD order
9. Image upload pipeline: multipart → Sharp → WebP + thumbnail

### STEP 2.3 — Frontend: Products Page

**Tartib:**
1. `features/products/ProductsPage.tsx` — grid + search + filters
2. `features/products/ProductCard.tsx` — virtualized grid item
3. `features/products/ProductModal.tsx` — create/edit form
4. `features/products/ImageUploader.tsx` — drag & drop, preview
5. `features/categories/CategoriesPage.tsx` — tree + DnD
6. `features/products/ProductDetailPage.tsx` — QR code
7. TanStack Query hooks: `useProducts()`, `useCategories()`
8. Debounced search (300ms)
9. Skeleton loading
10. Stok indikator ranglari

### STEP 2.4 — Tests

1. Integration: Product CRUD, Category CRUD, image upload
2. Unit: MoneyInput, SearchInput, StatusBadge
3. Factory: createProduct(), createCategory()

### FAZA 2 CHECKLIST:
- [ ] Mahsulot CRUD ishlaydi (create, read, update, soft delete)
- [ ] Rasm upload → WebP convert → thumbnail
- [ ] Kategoriya DnD reorder ishlaydi
- [ ] Qidiruv debounced ishlaydi
- [ ] 10K mahsulot bilan virtual scroll silliq
- [ ] Integration testlar o'tadi

---

## FAZA 3: POS / Kassa

### STEP 3.1 — Prisma Schema Extension

```
Yangi modellar:
- Receipt (id, number, items, subtotal, discount, total, paymentMethod, cashReceived, change, customerId?, createdById)
- ReceiptItem (id, receiptId, productId, quantity, unitPrice, costPrice, discount, total)
- Customer (id, name, phone, debtLimit?, isDeleted, deletedAt)
- ReturnReceipt (id, receiptId, items, total, reason, createdById)
- ReturnReceiptItem (id, returnReceiptId, productId, quantity, unitPrice, total)
```

### STEP 3.2 — Backend: Receipt + POS

**Tartib:**
1. `modules/receipt/receipt.service.ts`:
   - `createReceipt()` — Prisma.$transaction:
     - ReceiptItem create
     - Atomic stock decrement (har bir item)
     - Discount calculate (3-tier)
     - Mixed payment logic
     - Customer debt (agar DEBT method)
   - `getReceipts()` — paginated, filter by date/cashier
   - `getReceiptById()` — includes items, customer
   - `createPartialReturn()` — 14 kun limit, stok qaytarish
   - `saveDraft()` / `loadDraft()` / `deleteDraft()`
2. WebSocket events: `receipt:created`, `product:stockUpdated`

### STEP 3.3 — Frontend: POS Page

**ENG MUHIM SAHIFA. Tartib:**
1. `features/pos/PosPage.tsx` — 2-panel layout (product grid | cart)
2. `features/pos/ProductGrid.tsx` — virtualized, search, category tabs
3. `features/pos/Cart.tsx` — items, total, actions
4. `features/pos/CartItem.tsx` — inline qty edit, swipe delete
5. `features/pos/NumPad.tsx` — katta raqam tugmalari
6. `features/pos/PaymentModal.tsx` — 5 usul (CASH/CARD/CLICK/TRANSFER/DEBT)
7. `features/pos/MixedPaymentForm.tsx` — har usulga summa
8. `features/pos/ReceiptPreview.tsx` — chek ko'rinishi
9. `features/pos/FloatingCalculator.tsx` — draggable
10. `stores/cartStore.ts` — addItem, removeItem, updateQty, clear, getDraft
11. Keyboard shortcuts: F1-F5 to'lov, Enter, Delete, Ctrl+S/P
12. Sound feedback: scan, add-to-cart, success, error
13. Auto-focus: search inputga

### STEP 3.4 — Tests (KRITIK)

1. **Integration (ENG MUHIM):**
   - Receipt CRUD — CASH, MIXED, DEBT payments
   - Atomic stock — parallel requests
   - ReceiptItem — to'g'ri yozilishi
   - Discount — 3-tier calculation
   - Empty cart → 400
   - RBAC — kassir/admin ruxsatlari
2. **Integration: Vozvrat**
   - 14 kun limit
   - Stok qaytishi
   - Qarz kamayishi
3. **Unit:** NumPad, cartStore, useKeyboardShortcut
4. **E2E:** POS full sale flow (search → add → pay → receipt)

### FAZA 3 CHECKLIST:
- [ ] POS sahifa 2-panel layout (desktop + mobile)
- [ ] Mahsulot qidiruv + savatga qo'shish
- [ ] 5 ta to'lov usuli ishlaydi (CASH/CARD/CLICK/TRANSFER/DEBT)
- [ ] MIXED to'lov — yig'indisi = total
- [ ] Auto-discount (10/50/100 dona)
- [ ] Stok avtomatik kamayadi (atomic)
- [ ] Qarzga sotuv — mijoz majburiy
- [ ] Keyboard shortcuts (F1-F5, Enter, Ctrl+S)
- [ ] Mobile da BottomSheet payment
- [ ] Sound feedback
- [ ] Integration testlar BARCHASI o'tadi

---

## FAZA 4: Moliyaviy Modullar

### STEP 4.1 — Database

```
Yangi/kengaytirilgan modellar:
- Debt (full — status, dueDate, payments, extensions)
- DebtPayment (id, debtId, amount, method, note, createdById)
- DebtExtension (id, debtId, oldDate, newDate, reason, approvedById)
- Supplier (id, name, phone, company, balance)
- SupplierTransaction (id, supplierId, type, total, currency, createdById)
- SupplierTransactionItem (id, transactionId, productId, quantity, unitPrice)
- Expense (id, category, amount, description, createdById)
```

### STEP 4.2 — Backend Modules

1. **Debt module:** CRUD + approval + partial payment + extend + limit check
2. **Customer module:** CRUD + loyalty points + debt summary
3. **Supplier module:** CRUD + transaction (stock auto-increase, costPrice update)
4. **Expense module:** CRUD + category stats

### STEP 4.3 — Frontend Pages

1. `features/debts/DebtsPage.tsx` — filter, status badges, aging
2. `features/debts/DebtDetailModal.tsx` — payments, extend, history
3. `features/customers/CustomersPage.tsx` — search, loyalty, import
4. `features/suppliers/SuppliersPage.tsx` — transactions, balance
5. `features/expenses/ExpensesPage.tsx` — category filter, chart

### STEP 4.4 — Tests

1. Integration: Debt lifecycle, Supplier costPrice update, Customer CRUD
2. E2E: Qarz flow, Vozvrat flow

### FAZA 4 CHECKLIST:
- [ ] Qarz yaratish → qisman to'lov → to'liq to'lov
- [ ] Qarz limit ishlaydi
- [ ] Kirimda costPrice avtomatik yangilanadi
- [ ] 20%+ farqda alert
- [ ] Xarajatlar kategoriya bo'yicha stat
- [ ] Mijoz loyalty points

---

## FAZA 5: HR Moduli

### STEP 5.1 — Database

```
Yangi modellar:
- Attendance (id, userId, checkIn, checkOut, status, location)
- StoreLocation (id, name, lat, lng, radius, qrToken)
- Salary (id, userId, month, base, kpiBonus, salesBonus, advances, fines, total, status)
- SalarySetting (id, userId, baseSalary, salesPercent)
- Advance (id, userId, amount, status, approvedById)
- KpiTemplate, KpiAssignment, KpiRecord
- CashierSession (id, userId, openedAt, closedAt, openingBalance, closingBalance)
```

### STEP 5.2 — Backend

1. **Attendance:** check-in/out + GPS validation (Haversine)
2. **StoreLocation:** CRUD + QR token
3. **Salary:** auto-calculation + bloklash + "qayta hisoblash"
4. **Advance:** CRUD + approval workflow
5. **KPI:** template → assignment → record → calculation

### STEP 5.3 — Frontend

1. `features/hr/EmployeesPage.tsx`
2. `features/hr/AttendancePage.tsx` + Leaflet xarita
3. `features/hr/SalaryPage.tsx`
4. `features/hr/KpiPage.tsx`
5. Sidebar: "Keldim" / "Ketdim" tugmalari

### FAZA 5 CHECKLIST:
- [ ] GPS davomat ishlaydi
- [ ] Oylik auto-hisoblash to'g'ri
- [ ] PAID oylikni qayta hisoblash mumkin emas
- [ ] KPI bonus to'g'ri hisoblanadi
- [ ] Avans approval workflow

---

## FAZA 6: Qolgan Modullar

### STEP 6.1 — Database + Backend + Frontend

1. **Order** — CRUD + status workflow (PENDING → CONFIRMED → SHIPPED → DELIVERED)
2. **Warehouse** — CRUD + stock management
3. **Contact** — CRUD + categories + auto-sync (Customer/Supplier)
4. **Partner** — CRUD + payments

### FAZA 6 CHECKLIST:
- [ ] Buyurtma status workflow
- [ ] Ombor CRUD
- [ ] Kontaktlar auto-sync
- [ ] Hamkorlar to'lov

---

## FAZA 7: Integratsiyalar + Dashboard + Deploy

### STEP 7.1 — Telegram Botlar

```
3 ta bot:
1. POS Bot — har sotuv haqida Admin ga xabar
2. Qarz Bot — muddati o'tgan qarzlar, yangi qarzlar
3. Davomat Bot — keldim/ketdim xabarlari
```

**Tartib:**
1. `modules/telegram/telegram.service.ts` — 3 bot init
2. Webhook setup
3. Ogohlantirishlar: manfiy stok, 20%+ narx, offline sync, backup fail

### STEP 7.2 — Dashboard Analytics

```
8 ta grafik:
1. Sotuv trend (line) — kunlik/haftalik/oylik
2. Top 10 mahsulot (bar)
3. Top 10 mijoz (bar)
4. Kategoriya sotuv (donut)
5. Sotuv soatlari (bar) — qaysi soatda ko'p
6. Qarz aging (table) — muddati o'tgan
7. Foyda/zarar trend (area)
8. Kassir samaradorligi (bar)
```

**Tartib:**
1. `modules/dashboard/dashboard.service.ts` — SQL aggregation queries
2. Redis cache (5 min TTL)
3. `features/dashboard/DashboardPage.tsx` — 8 ta Recharts grafik
4. StatCard lar: bugungi sotuv, haftalik, oylik, qarzlar

### STEP 7.3 — Excel Export

```bash
pnpm --filter @sardorbek/web add xlsx
```

- Mahsulotlar, sotuvlar, qarzlar, xarajatlar, oylik, mijozlar
- Dynamic import (`import('xlsx')`) — bundle da emas

### STEP 7.4 — Cron Jobs

```
jobs/
├── index.ts      # CRON_JOBS registry + pg_try_advisory_xact_lock
├── backup.ts     # 6h/daily/weekly + cleanup
├── overdue.ts    # Muddati o'tgan qarz xabar (09:00)
├── stock.ts      # Manfiy stok xabar (08:00)
└── session.ts    # Expired session cleanup (4h)
```

### STEP 7.5 — Settings Page

```
Settings:
- Valyuta kursi (USD/UZS)
- Do'kon nomi, manzil, telefon
- Sound toggle
- Til tanlash
- returnPeriodDays (default: 14)
- allowNegativeStock (default: true)
- Parol o'zgartirish
```

### STEP 7.6 — PWA Setup

```bash
pnpm --filter @sardorbek/web add -D vite-plugin-pwa
```

- `manifest.json` — icons, colors, name
- Service Worker (Workbox) — cache strategies
- Install prompt

### STEP 7.7 — VPS Deploy Setup

**VPS da (sardorbek.biznesjon.uz):**

```bash
# 1. Server tayyorlash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pnpm pm2

# 2. PostgreSQL 16 install
sudo apt install -y postgresql-16
sudo -u postgres createuser sardorbek_user -P
sudo -u postgres createdb sardorbek_db -O sardorbek_user

# 3. Redis 7 install
sudo apt install -y redis-server
sudo systemctl enable redis-server

# 4. Nginx config
sudo nano /etc/nginx/sites-available/sardorbek
```

**Nginx config:**
```nginx
server {
    server_name sardorbek.biznesjon.uz;

    # Frontend (static)
    location / {
        alias /var/www/sardorbek/current/web/;
        try_files $uri $uri/ /index.html;
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-Content-Type-Options "nosniff";
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-Content-Type-Options "nosniff";
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Uploads
    location /uploads/ {
        alias /var/www/sardorbek/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff";
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/sardorbek.biznesjon.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sardorbek.biznesjon.uz/privkey.pem;
}
```

```bash
# 5. SSL
sudo certbot --nginx -d sardorbek.biznesjon.uz

# 6. PM2 ecosystem
# ecosystem.config.js (loyihada)

# 7. deploy.sh yaratish (symlink-based)

# 8. Security hardening
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### STEP 7.8 — GitHub Actions Deploy

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  ci:
    uses: ./.github/workflows/ci.yml

  deploy:
    needs: ci
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: cd /var/www/sardorbek && bash deploy.sh
```

### STEP 7.9 — Health Check + Monitoring

1. `/health/live` — process alive
2. `/health/ready` — DB + Redis connected
3. `/health/startup` — migrations ran
4. `modules/monitoring/` — system info, metrics

### STEP 7.10 — Tests

1. RBAC Matrix test — barcha endpoint × barcha rol
2. E2E: Auth flow, Role access, Mobile viewport
3. Load test: autocannon — POS, search, dashboard
4. Security tests: JWT, file upload, input validation, rate limit
5. Lighthouse CI

### FAZA 7 CHECKLIST:
- [ ] https://sardorbek.biznesjon.uz ishlaydi
- [ ] SSL sertifikat valid
- [ ] 3 Telegram bot ishlaydi
- [ ] Dashboard 8 grafik to'g'ri
- [ ] Excel export ishlaydi
- [ ] Cron joblar ishlaydi (backup, xabarlar)
- [ ] PWA o'rnatiladi (mobile)
- [ ] CI/CD: PR → test → main push → auto deploy
- [ ] PM2 cluster (2 instance) ishlaydi
- [ ] Health check endpoints ishlaydi
- [ ] Load test targets o'tadi
- [ ] Bundle < 300KB

---

## FAZA 8: Offline + Polish

### STEP 8.1 — Offline Infrastructure

```bash
pnpm --filter @sardorbek/web add dexie
```

**Tartib:**
1. `services/offlineDb.ts` — Dexie schema (products, receipts, customers, debts)
2. `stores/offlineStore.ts` — syncQueue, status, lastSync
3. `hooks/useOfflineSync.ts` — auto-sync on reconnect
4. Offline detection component (red bar)

### STEP 8.2 — Offline POS

1. Products cache → IndexedDB (online bo'lganda sync)
2. Offline sotuv → local save → online bo'lganda sync
3. Offline qarzga sotuv → offlineId → sync → dedup
4. Sync tartib: receipts → debts → payments
5. Conflict resolution: qarz limit oshgan → CONFLICT → Admin

### STEP 8.3 — Gestures + Polish

1. Swipe gestures (cart item delete, page navigation)
2. Performance: React.memo, useMemo kerak joylarda
3. Bundle analysis (vite-bundle-visualizer)
4. Final responsive tekshiruv (375px / 768px / 1280px)

### STEP 8.4 — Final Tests

1. E2E: Offline sale → sync → dedup
2. E2E: Network interrupt → re-sync → no duplicates
3. E2E: Offline debt conflict
4. E2E: i18n switch + layout
5. Unit: offlineStore
6. i18n: barcha key lar 3 tilda

### FAZA 8 CHECKLIST:
- [ ] Offline sotuv ishlaydi
- [ ] Online bo'lganda auto-sync
- [ ] Dublikat yo'q (offlineId dedup)
- [ ] Conflict resolution ishlaydi
- [ ] Swipe gestures silliq
- [ ] Bundle < 300KB (optimized)
- [ ] Barcha sahifalar 3 viewport da to'g'ri
- [ ] PWA offline ishlaydi

---

## FINAL VERIFICATION

```bash
# 1. Lint + Type check
pnpm lint && pnpm typecheck

# 2. Unit tests
pnpm test:unit  # coverage 80%+

# 3. Integration tests
pnpm test:integration  # barcha API testlar

# 4. E2E tests
pnpm test:e2e  # 13+ flow

# 5. Load test
pnpm test:load  # POS p99 < 500ms

# 6. Lighthouse
# FCP < 1.5s, LCP < 2.5s, bundle < 300KB

# 7. Security
# JWT, file upload, SQL injection, rate limit testlar

# 8. Backup test
# pg_dump → pg_restore → data integrity

# 9. PM2 restart test
# pm2 reload → zero-downtime

# 10. Full E2E manual
# Login → POS sotuv → Qarz → Vozvrat → Dashboard → Export
```

---

## DEPENDENCY INSTALL BUYRUQLARI (to'liq)

### Root
```bash
pnpm add -Dw typescript eslint prettier @playwright/test
```

### Shared (@sardorbek/shared)
```bash
pnpm --filter @sardorbek/shared add zod
pnpm --filter @sardorbek/shared add -D typescript
```

### API (@sardorbek/api)
```bash
# Core
pnpm --filter @sardorbek/api add fastify @fastify/cors @fastify/helmet @fastify/cookie @fastify/rate-limit @fastify/multipart
pnpm --filter @sardorbek/api add @prisma/client ioredis
pnpm --filter @sardorbek/api add jsonwebtoken bcrypt
pnpm --filter @sardorbek/api add socket.io @socket.io/redis-adapter
pnpm --filter @sardorbek/api add pino pino-pretty
pnpm --filter @sardorbek/api add sharp
pnpm --filter @sardorbek/api add node-telegram-bot-api
pnpm --filter @sardorbek/api add node-cron
pnpm --filter @sardorbek/api add qrcode

# Dev
pnpm --filter @sardorbek/api add -D prisma typescript tsx @types/node
pnpm --filter @sardorbek/api add -D @types/jsonwebtoken @types/bcrypt @types/node-cron
pnpm --filter @sardorbek/api add -D vitest @faker-js/faker autocannon
```

### Web (@sardorbek/web)
```bash
# Core
pnpm --filter @sardorbek/web add react react-dom
pnpm --filter @sardorbek/web add @tanstack/react-router @tanstack/react-query
pnpm --filter @sardorbek/web add zustand ky socket.io-client
pnpm --filter @sardorbek/web add react-hook-form @hookform/resolvers zod
pnpm --filter @sardorbek/web add react-i18next i18next i18next-browser-languagedetector
pnpm --filter @sardorbek/web add motion sonner
pnpm --filter @sardorbek/web add dexie
pnpm --filter @sardorbek/web add @tanstack/react-virtual
pnpm --filter @sardorbek/web add recharts
pnpm --filter @sardorbek/web add react-leaflet leaflet
pnpm --filter @sardorbek/web add qrcode.react html5-qrcode
pnpm --filter @sardorbek/web add @dnd-kit/core @dnd-kit/sortable
pnpm --filter @sardorbek/web add @use-gesture/react
pnpm --filter @sardorbek/web add xlsx

# Dev
pnpm --filter @sardorbek/web add -D typescript vite @vitejs/plugin-react
pnpm --filter @sardorbek/web add -D tailwindcss @tailwindcss/vite
pnpm --filter @sardorbek/web add -D vite-plugin-pwa
pnpm --filter @sardorbek/web add -D vitest jsdom @testing-library/react @testing-library/jest-dom msw
pnpm --filter @sardorbek/web add -D @types/react @types/react-dom @types/leaflet
```

---

## QURISH TARTIBI XULOSA

```
FAZA 1 (2.5h) → Monorepo + Shared + API scaffold + Prisma + Auth + Frontend + Layout + Tests + CI
     ↓
FAZA 2 (2h)   → Product + Category CRUD + Image upload + Frontend pages
     ↓
FAZA 3 (2.5h) → POS sahifa + Receipt + Payment + Cart + Keyboard + Sound
     ↓
FAZA 4 (2.5h) → Debt + Customer + Supplier + Expense + Multi-currency
     ↓
FAZA 5 (2.5h) → Attendance + Salary + KPI + Advance
     ↓
FAZA 6 (1.5h) → Order + Warehouse + Contact + Partner
     ↓
FAZA 7 (2.5h) → Telegram + Dashboard + Excel + Cron + PWA + VPS Deploy + CI/CD
     ↓
FAZA 8 (2.5h) → Offline + Sync + Gestures + Polish + Final tests
     ↓
DONE ✓ — sardorbek.biznesjon.uz LIVE
```

> Har bir FAZA ichida STEP lar **ketma-ket** bajariladi.
> Har FAZA tugaganda CHECKLIST tekshiriladi.
> FAZA 7 dan keyin loyiha PRODUCTION da ishlaydi.
> FAZA 8 — offline + final polish.
