/**
 * MongoDB → PostgreSQL Migration Script
 *
 * MongoDB dan MA'LUMOT O'CHIRILMAYDI — faqat copy qilinadi.
 * Ketma-ketlik: Users → Categories → Warehouses → Products → Customers → Contacts → ...
 */

import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const MONGO_URI = 'mongodb+srv://ozodbekweb011_db_user:pPZfsDeWMONS0dz0@nazorat1.kcvyamy.mongodb.net/nazorat?retryWrites=true&w=majority&appName=nazorat1&ssl=true&serverSelectionTimeoutMS=10000&socketTimeoutMS=45000&connectTimeoutMS=10000';
const PG_URL = 'postgresql://postgres:2410@localhost:5432/sardorbek_db';

const prisma = new PrismaClient({ datasourceUrl: PG_URL });

// MongoDB ObjectId → PostgreSQL UUID mapping
const idMap = new Map<string, string>();

function mapId(mongoId: string): string {
  return idMap.get(mongoId) ?? mongoId;
}

async function main() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db!;
  console.log('✅ MongoDB connected');

  console.log('🔗 Connecting to PostgreSQL...');
  await prisma.$connect();
  console.log('✅ PostgreSQL connected\n');

  // ═══════════════════════════════════════
  // 1. USERS (8 ta)
  // ═══════════════════════════════════════
  console.log('👤 Migrating Users...');
  const mongoUsers = await db.collection('users').find({}).toArray();
  const ROLE_MAP: Record<string, string> = { admin: 'ADMIN', cashier: 'CASHIER', helper: 'HELPER' };
  const defaultPassword = await bcrypt.hash('admin1234', 12);

  const usedLogins = new Set<string>();
  for (const u of mongoUsers) {
    let login = (u.login ?? u.name?.toLowerCase().replace(/\s/g, '') ?? 'user').substring(0, 50);
    // Ensure unique login
    if (usedLogins.has(login)) {
      login = `${login}_${Date.now().toString(36)}`;
    }
    usedLogins.add(login);

    try {
      const user = await prisma.user.create({
        data: {
          login,
          password: defaultPassword,
          name: u.name ?? 'Unknown',
          role: (ROLE_MAP[u.role] ?? 'HELPER') as 'ADMIN' | 'CASHIER' | 'HELPER',
          phone: u.phone ?? null,
          isActive: true,
        },
      });
      idMap.set(u._id.toString(), user.id);
    } catch (err) {
      console.error(`  ⚠️ User skip: ${u.name} — ${(err as Error).message}`);
    }
  }
  console.log(`  ✅ ${mongoUsers.length} ta user migrate qilindi\n`);

  // Admin user ID (default createdBy uchun)
  const adminId = idMap.get(mongoUsers.find((u) => u.role === 'admin')?._id?.toString() ?? '') ?? (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))?.id ?? '';

  // ═══════════════════════════════════════
  // 2. CATEGORIES + SUBCATEGORIES (11 ta)
  // ═══════════════════════════════════════
  console.log('📁 Migrating Categories...');
  const mongoCats = await db.collection('categories').find({}).toArray();

  for (const c of mongoCats) {
    const cat = await prisma.category.create({
      data: {
        name: c.name,
        order: c.order ?? 0,
      },
    });
    idMap.set(c._id.toString(), cat.id);

    // Subcategories
    if (c.subcategories && Array.isArray(c.subcategories)) {
      for (const sub of c.subcategories) {
        const subCat = await prisma.subCategory.create({
          data: {
            name: sub.name,
            categoryId: cat.id,
            order: sub.order ?? 0,
          },
        });
        idMap.set(sub._id.toString(), subCat.id);
      }
    }
  }
  console.log(`  ✅ ${mongoCats.length} ta category migrate qilindi\n`);

  // ═══════════════════════════════════════
  // 3. WAREHOUSES (3 ta)
  // ═══════════════════════════════════════
  console.log('🏭 Migrating Warehouses...');
  const mongoWarehouses = await db.collection('warehouses').find({}).toArray();

  for (const w of mongoWarehouses) {
    const wh = await prisma.warehouse.create({
      data: {
        name: w.name,
        address: w.address ?? null,
      },
    });
    idMap.set(w._id.toString(), wh.id);
  }
  console.log(`  ✅ ${mongoWarehouses.length} ta warehouse migrate qilindi\n`);

  // ═══════════════════════════════════════
  // 4. CONTACT CATEGORIES (5 ta)
  // ═══════════════════════════════════════
  console.log('🏷️ Migrating Contact Categories...');
  const mongoCCats = await db.collection('contactcategories').find({}).toArray();

  for (const cc of mongoCCats) {
    const contactCat = await prisma.contactCategory.create({
      data: { name: cc.name },
    });
    idMap.set(cc._id.toString(), contactCat.id);
  }
  console.log(`  ✅ ${mongoCCats.length} ta contact category migrate qilindi\n`);

  // ═══════════════════════════════════════
  // 5. STORE LOCATIONS (1 ta)
  // ═══════════════════════════════════════
  console.log('📍 Migrating Store Locations...');
  const mongoLocs = await db.collection('storelocations').find({}).toArray();

  for (const loc of mongoLocs) {
    await prisma.$executeRaw`
      INSERT INTO "StoreLocation" (id, name, lat, lng, radius, address, "workStartTime", "isActive", "qrToken", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${loc.name}, ${loc.latitude}, ${loc.longitude}, ${loc.allowedRadius ?? 100}, ${loc.address ?? null}, ${loc.workStartTime ?? '09:00'}, ${loc.isActive ?? true}, ${loc.qrToken ?? crypto.randomUUID()}, NOW(), NOW())
    `;
  }
  console.log(`  ✅ ${mongoLocs.length} ta store location migrate qilindi\n`);

  // ═══════════════════════════════════════
  // 6. PRODUCTS (1842 ta) — ENG MUHIM
  // ═══════════════════════════════════════
  console.log('📦 Migrating Products (1842 ta)...');
  const mongoProducts = await db.collection('products').find({}).toArray();

  // Category name → ID mapping
  const catNameMap = new Map<string, string>();
  const pgCats = await prisma.category.findMany({ include: { subCategories: true } });
  for (const cat of pgCats) {
    catNameMap.set(cat.name.toLowerCase(), cat.id);
    for (const sub of cat.subCategories) {
      catNameMap.set(`${cat.name.toLowerCase()}:${sub.name.toLowerCase()}`, sub.id);
    }
  }

  let productCount = 0;
  for (const p of mongoProducts) {
    // Find category
    let categoryId = catNameMap.get(p.category?.toLowerCase() ?? '');
    if (!categoryId) {
      // Create missing category
      const newCat = await prisma.category.create({ data: { name: p.category ?? 'Boshqa' } });
      categoryId = newCat.id;
      catNameMap.set((p.category ?? 'boshqa').toLowerCase(), newCat.id);
    }

    // Find subcategory
    let subCategoryId: string | null = null;
    if (p.subcategory) {
      const subKey = `${(p.category ?? '').toLowerCase()}:${p.subcategory.toLowerCase()}`;
      subCategoryId = catNameMap.get(subKey) ?? null;
    }

    // Find warehouse
    const warehouseId = p.warehouse ? mapId(p.warehouse.toString()) : null;

    // Price from prices array
    const price = p.prices?.[0]?.amount ?? 0;
    const discountPercent = p.prices?.[0]?.discountPercent ?? 0;

    // Unit mapping
    const UNIT_MAP: Record<string, string> = {
      dona: 'PIECE', kg: 'KG', metr: 'METER', komplekt: 'SET', pachka: 'PACK', quti: 'BOX',
    };
    const unit = UNIT_MAP[p.unit?.toLowerCase() ?? 'dona'] ?? 'PIECE';

    try {
      const product = await prisma.product.create({
        data: {
          name: p.name,
          price,
          costPrice: 0, // MongoDB da costPrice yo'q — keyinroq supplier import dan to'ldiriladi
          dollarRate: p.dollarRate ?? null,
          discountPercent: discountPercent,
          stock: p.quantity ?? 0,
          minStock: p.minStock ?? 5,
          unit: unit as 'PIECE' | 'KG' | 'METER' | 'SET' | 'PACK' | 'BOX',
          boxQuantity: p.boxInfo?.unitsPerBox ?? 1,
          meterPerRoll: p.metrInfo?.metersPerOram || null,
          packQuantity: p.pachkaInfo?.unitsPerPachka || null,
          warehouseId: warehouseId && idMap.has(p.warehouse?.toString()) ? warehouseId : null,
          categoryId,
          subCategoryId,
          images: p.images ?? [],
          description: p.description || null,
        },
      });
      idMap.set(p._id.toString(), product.id);
      productCount++;
    } catch (err) {
      console.error(`  ⚠️ Product skip: ${p.name} — ${(err as Error).message}`);
    }
  }
  console.log(`  ✅ ${productCount}/${mongoProducts.length} ta product migrate qilindi\n`);

  // ═══════════════════════════════════════
  // 7. CUSTOMERS (614 ta)
  // ═══════════════════════════════════════
  console.log('👥 Migrating Customers...');
  const mongoCustomers = await db.collection('customers').find({}).toArray();
  let custCount = 0;

  for (const c of mongoCustomers) {
    const phone = c.phone?.trim();
    if (!phone) continue;

    try {
      const customer = await prisma.customer.create({
        data: {
          name: c.name ?? 'Noma\'lum',
          phone,
          address: c.address || null,
          loyaltyPoints: c.totalBalls ?? 0,
        },
      });
      // email va createdById raw SQL bilan keyinroq
      if (c.email || c.createdBy) {
        const emailVal = c.email || null;
        const createdByVal = c.createdBy ? mapId(c.createdBy.toString()) : null;
        await prisma.$executeRaw`UPDATE "Customer" SET "email" = ${emailVal}, "createdById" = ${createdByVal} WHERE id = ${customer.id}`;
      }
      idMap.set(c._id.toString(), customer.id);
      custCount++;
    } catch (err) {
      console.error(`  ⚠️ Customer skip: ${c.name} (${phone}) — ${(err as Error).message}`);
    }
  }
  console.log(`  ✅ ${custCount}/${mongoCustomers.length} ta customer migrate qilindi\n`);

  // ═══════════════════════════════════════
  // 8. CONTACTS (4061 ta)
  // ═══════════════════════════════════════
  console.log('📇 Migrating Contacts...');
  const mongoContacts = await db.collection('contacts').find({}).toArray();
  let contactCount = 0;

  for (const c of mongoContacts) {
    const categoryId = c.categories?.[0] ? mapId(c.categories[0].toString()) : null;
    // Verify categoryId exists in PG
    const validCatId = categoryId && idMap.has(c.categories?.[0]?.toString()) ? categoryId : null;

    try {
      const contact = await prisma.contact.create({
        data: {
          name: c.name ?? '',
          phone: c.phone ?? '',
          categoryId: validCatId,
        },
      });
      // createdById raw SQL bilan
      const createdByVal = c.createdBy && c.createdBy !== 'hardcoded-admin-id' ? mapId(c.createdBy.toString()) : adminId || null;
      if (createdByVal) {
        await prisma.$executeRaw`UPDATE "Contact" SET "createdById" = ${createdByVal} WHERE id = ${contact.id}`;
      }
      contactCount++;
    } catch {
      // Skip duplicates
    }
  }
  console.log(`  ✅ ${contactCount}/${mongoContacts.length} ta contact migrate qilindi\n`);

  // ═══════════════════════════════════════
  // 9. SUPPLIERS (1 ta)
  // ═══════════════════════════════════════
  console.log('🚚 Migrating Suppliers...');
  const mongoSuppliers = await db.collection('suppliers').find({}).toArray();

  for (const s of mongoSuppliers) {
    const supplier = await prisma.supplier.create({
      data: {
        name: s.name,
        phone: s.phone || null,
        balance: s.totalDebt ?? 0,
      },
    });
    idMap.set(s._id.toString(), supplier.id);
  }
  console.log(`  ✅ ${mongoSuppliers.length} ta supplier migrate qilindi\n`);

  // ═══════════════════════════════════════
  // 10. SUPPLIER TRANSACTIONS (7 ta)
  // ═══════════════════════════════════════
  console.log('📋 Migrating Supplier Transactions...');
  const mongoST = await db.collection('suppliertransactions').find({}).toArray();

  for (const st of mongoST) {
    const supplierId = mapId(st.supplier?.toString() ?? '');
    if (!idMap.has(st.supplier?.toString())) continue;

    try {
      await prisma.supplierTransaction.create({
        data: {
          supplierId,
          type: 'IMPORT',
          total: st.totalAmount ?? 0,
          currency: 'UZS',
          rate: 1,
          createdById: adminId,
          items: {
            create: (st.items ?? []).map((item: { product: string; name: string; quantity: number; price: number; total: number }) => ({
              productId: idMap.get(item.product?.toString()) ?? '',
              quantity: item.quantity ?? 1,
              unitPrice: item.price ?? 0,
              total: item.total ?? 0,
            })).filter((item: { productId: string }) => item.productId),
          },
        },
      });
    } catch (err) {
      console.error(`  ⚠️ ST skip: ${(err as Error).message}`);
    }
  }
  console.log(`  ✅ ${mongoST.length} ta supplier transaction migrate qilindi\n`);

  // ═══════════════════════════════════════
  // 11. DEBTS (7 ta)
  // ═══════════════════════════════════════
  console.log('💳 Migrating Debts...');
  const mongoDebts = await db.collection('debts').find({}).toArray();

  const STATUS_MAP: Record<string, string> = { active: 'ACTIVE', partial: 'PARTIAL', paid: 'PAID', overdue: 'OVERDUE' };

  for (const d of mongoDebts) {
    const customerId = mapId(d.customer?.toString() ?? '');
    if (!idMap.has(d.customer?.toString())) continue;

    try {
      const debt = await prisma.debt.create({
        data: {
          customerId,
          amount: d.amount ?? 0,
          remainingAmount: (d.amount ?? 0) - (d.paidAmount ?? 0),
          status: (STATUS_MAP[d.status] ?? 'ACTIVE') as 'ACTIVE' | 'PARTIAL' | 'PAID' | 'OVERDUE',
          dueDate: d.dueDate ? new Date(d.dueDate) : new Date(),
          note: d.description || null,
          createdById: d.createdBy ? mapId(d.createdBy.toString()) : adminId,
          payments: {
            create: (d.payments ?? []).map((p: { amount: number; method: string; date: string }) => ({
              amount: p.amount ?? 0,
              method: p.method?.toUpperCase() ?? 'CASH',
              createdById: adminId,
              createdAt: p.date ? new Date(p.date) : new Date(),
            })),
          },
        },
      });
      idMap.set(d._id.toString(), debt.id);
    } catch (err) {
      console.error(`  ⚠️ Debt skip: ${(err as Error).message}`);
    }
  }
  console.log(`  ✅ ${mongoDebts.length} ta debt migrate qilindi\n`);

  // ═══════════════════════════════════════
  // 12. EXPENSES (4 ta)
  // ═══════════════════════════════════════
  console.log('💰 Migrating Expenses...');
  const mongoExpenses = await db.collection('expenses').find({}).toArray();

  const CAT_MAP: Record<string, string> = {
    komunal: 'UTILITIES', ijara: 'RENT', maosh: 'SALARY', transport: 'TRANSPORT',
    reklama: 'MARKETING', tamir: 'REPAIR', soliq: 'TAX',
  };

  for (const e of mongoExpenses) {
    try {
      const expense = await prisma.expense.create({
        data: {
          category: CAT_MAP[e.category?.toLowerCase() ?? ''] ?? 'OTHER',
          amount: e.amount ?? 0,
          description: e.note || e.category || '',
          date: e.date ? new Date(e.date) : new Date(),
          createdById: adminId,
        },
      });
      // type raw SQL bilan
      if (e.type) {
        await prisma.$executeRaw`UPDATE "Expense" SET "type" = ${e.type} WHERE id = ${expense.id}`;
      }
    } catch (err) {
      console.error(`  ⚠️ Expense skip: ${(err as Error).message}`);
    }
  }
  console.log(`  ✅ ${mongoExpenses.length} ta expense migrate qilindi\n`);

  // ═══════════════════════════════════════
  // 13. SALARY SETTINGS (7 ta)
  // ═══════════════════════════════════════
  console.log('💵 Migrating Salary Settings...');
  const mongoSS = await db.collection('salarysettings').find({}).toArray();

  for (const ss of mongoSS) {
    const userId = mapId(ss.employee?.toString() ?? '');
    if (!idMap.has(ss.employee?.toString())) continue;

    try {
      await prisma.salarySetting.create({
        data: {
          userId,
          baseSalary: ss.baseSalary ?? 0,
          salesPercent: 0,
        },
      });
    } catch (err) {
      console.error(`  ⚠️ SalarySetting skip: ${(err as Error).message}`);
    }
  }
  console.log(`  ✅ ${mongoSS.length} ta salary setting migrate qilindi\n`);

  // ═══════════════════════════════════════
  // 14. WAREHOUSES SETTINGS (default)
  // ═══════════════════════════════════════
  console.log('⚙️ Creating default settings...');
  const defaultSettings = [
    { key: 'storeName', value: 'Sardorbek Furnitura', type: 'string' },
    { key: 'storePhone', value: '', type: 'string' },
    { key: 'storeAddress', value: 'Buxoro', type: 'string' },
    { key: 'currencyRate', value: '12800', type: 'number' },
    { key: 'returnPeriodDays', value: '14', type: 'number' },
    { key: 'allowNegativeStock', value: 'true', type: 'boolean' },
    { key: 'language', value: 'uz', type: 'string' },
  ];
  for (const s of defaultSettings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  console.log(`  ✅ ${defaultSettings.length} ta setting yaratildi\n`);

  // ═══════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════
  console.log('═══════════════════════════════════');
  console.log('📊 MIGRATSIYA YAKUNLANDI!');
  console.log('═══════════════════════════════════');

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.subCategory.count(),
    prisma.warehouse.count(),
    prisma.product.count(),
    prisma.customer.count(),
    prisma.contact.count(),
    prisma.supplier.count(),
    prisma.debt.count(),
    prisma.expense.count(),
    prisma.contactCategory.count(),
    prisma.storeLocation.count(),
    prisma.salarySetting.count(),
  ]);

  const labels = ['Users', 'Categories', 'SubCategories', 'Warehouses', 'Products', 'Customers', 'Contacts', 'Suppliers', 'Debts', 'Expenses', 'ContactCategories', 'StoreLocations', 'SalarySettings'];
  labels.forEach((l, i) => console.log(`  ${l}: ${counts[i]}`));

  console.log('\n⚠️ MongoDB dan HECH NARSA O\'CHIRILMADI — faqat copy qilindi.');
  console.log('⚠️ User parollar "admin1234" ga o\'zgartirildi — xavfsizlik uchun o\'zgartiring.');

  await mongoose.disconnect();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Migratsiya xatosi:', err);
  process.exit(1);
});
