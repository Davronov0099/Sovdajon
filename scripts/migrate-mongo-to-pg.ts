/**
 * MongoDB → PostgreSQL Migration Script
 * Sardorbek Furnitura ERP
 *
 * Migrates: Categories, Products, Customers, Suppliers, Contacts,
 *           ContactCategories, Users, Expenses, Warehouses,
 *           StoreLocations, SalarySettings, Debts, SupplierTransactions
 */

import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const MONGO_URI = 'mongodb+srv://ozodbekweb011_db_user:pPZfsDeWMONS0dz0@nazorat1.kcvyamy.mongodb.net/nazorat?retryWrites=true&w=majority&appName=nazorat1&ssl=true&serverSelectionTimeoutMS=10000&socketTimeoutMS=45000&connectTimeoutMS=10000';
const PG_URL = 'postgresql://postgres:2410@localhost:5432/sardorbek_db';

const prisma = new PrismaClient({ datasourceUrl: PG_URL });

async function clearDatabase() {
  console.log('Clearing PostgreSQL database...');

  // Delete in order (foreign key dependencies)
  await prisma.$executeRaw`TRUNCATE "AuditLog" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Fine" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "PartnerPayment" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Partner" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "OrderItem" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Order" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "KpiRecord" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "KpiAssignment" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "KpiTemplate" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "CashierSession" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Advance" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Salary" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "SalarySetting" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Attendance" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Expense" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "SupplierTransactionItem" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "SupplierTransaction" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "ReturnReceiptItem" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "ReturnReceipt" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "DebtExtension" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "DebtPayment" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Debt" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "ReceiptItem" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Receipt" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "PriceHistory" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Product" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "SubCategory" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Category" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Customer" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Supplier" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Contact" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "ContactCategory" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Warehouse" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "StoreLocation" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "User" CASCADE`;
  await prisma.$executeRaw`TRUNCATE "Setting" CASCADE`;

  // Reset autoincrement sequences
  await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "Product_code_seq" RESTART WITH 1`;
  await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "Receipt_number_seq" RESTART WITH 1`;
  await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "Order_number_seq" RESTART WITH 1`;

  console.log('Database cleared!');
}

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db!;

  console.log('Starting migration...\n');

  // ─── 1. USERS ───
  console.log('1. Migrating Users...');
  const mongoUsers = await db.collection('users').find({}).toArray();
  const userIdMap = new Map<string, string>(); // mongo _id → pg id
  let adminUserId = '';

  for (const u of mongoUsers) {
    const role = u.role === 'admin' ? 'ADMIN' : u.role === 'cashier' ? 'CASHIER' : 'HELPER';
    // Re-hash password with bcrypt 12 rounds (MongoDB may have different hash)
    const password = await bcrypt.hash('admin1234', 12);

    const created = await prisma.user.create({
      data: {
        login: u.name?.toLowerCase().replace(/\s+/g, '_') || `user_${mongoUsers.indexOf(u)}`,
        password,
        name: u.name || 'Unknown',
        role,
        phone: u.phone || null,
        isActive: true,
      },
    });
    userIdMap.set(u._id.toString(), created.id);
    if (role === 'ADMIN' && !adminUserId) adminUserId = created.id;
  }
  console.log(`   ${mongoUsers.length} users migrated`);

  // ─── 2. WAREHOUSES ───
  console.log('2. Migrating Warehouses...');
  const mongoWarehouses = await db.collection('warehouses').find({}).toArray();
  const warehouseIdMap = new Map<string, string>();

  for (const w of mongoWarehouses) {
    const created = await prisma.warehouse.create({
      data: {
        name: w.name || 'Ombor',
        address: w.address || null,
      },
    });
    warehouseIdMap.set(w._id.toString(), created.id);
  }
  console.log(`   ${mongoWarehouses.length} warehouses migrated`);

  // ─── 3. STORE LOCATIONS ───
  console.log('3. Migrating Store Locations...');
  const mongoLocations = await db.collection('storelocations').find({}).toArray();

  for (const loc of mongoLocations) {
    await prisma.storeLocation.create({
      data: {
        name: loc.name || "Do'kon",
        lat: loc.latitude || 0,
        lng: loc.longitude || 0,
        radius: loc.allowedRadius || 100,
        address: loc.address || null,
        workStartTime: loc.workStartTime || '09:00',
        isActive: loc.isActive !== false,
        qrToken: loc.qrToken || undefined,
      },
    });
  }
  console.log(`   ${mongoLocations.length} store locations migrated`);

  // ─── 4. CONTACT CATEGORIES ───
  console.log('4. Migrating Contact Categories...');
  const mongoContactCats = await db.collection('contactcategories').find({}).toArray();
  const contactCatIdMap = new Map<string, string>();

  for (const cc of mongoContactCats) {
    const created = await prisma.contactCategory.create({
      data: { name: cc.name || 'Boshqa' },
    });
    contactCatIdMap.set(cc._id.toString(), created.id);
  }
  console.log(`   ${mongoContactCats.length} contact categories migrated`);

  // ─── 5. CATEGORIES + SUBCATEGORIES ───
  console.log('5. Migrating Categories + SubCategories...');
  const mongoCategories = await db.collection('categories').find({}).toArray();
  const categoryNameMap = new Map<string, string>(); // name → pg id
  const subCategoryNameMap = new Map<string, string>(); // "cat:subcat" → pg id

  for (const cat of mongoCategories) {
    const created = await prisma.category.create({
      data: {
        name: cat.name || 'Nomi yo\'q',
        order: cat.order || 0,
      },
    });
    categoryNameMap.set(cat.name, created.id);

    // Sub-categories
    if (cat.subcategories && Array.isArray(cat.subcategories)) {
      for (const sub of cat.subcategories) {
        const subCreated = await prisma.subCategory.create({
          data: {
            name: sub.name,
            categoryId: created.id,
            order: sub.order || 0,
          },
        });
        subCategoryNameMap.set(`${cat.name}:${sub.name}`, subCreated.id);
      }
    }
  }
  console.log(`   ${mongoCategories.length} categories migrated`);

  // ─── 6. PRODUCTS ───
  console.log('6. Migrating Products...');
  const mongoProducts = await db.collection('products').find({}).toArray();
  const productIdMap = new Map<string, string>();
  let productCount = 0;

  // Get first warehouse ID for default
  const defaultWarehouseId = warehouseIdMap.values().next().value || null;

  // Ensure "Boshqa" category exists for uncategorized products
  let defaultCategoryId = categoryNameMap.get('Boshqa');
  if (!defaultCategoryId) {
    const created = await prisma.category.create({ data: { name: 'Boshqa', order: 99 } });
    defaultCategoryId = created.id;
    categoryNameMap.set('Boshqa', created.id);
  }

  for (const p of mongoProducts) {
    const categoryId = categoryNameMap.get(p.category) || defaultCategoryId;

    const subCategoryId = p.subcategory ? subCategoryNameMap.get(`${p.category}:${p.subcategory}`) : null;
    // Get sale price from "unit" type, fallback to first entry
    const unitPriceEntry = (p.prices || []).find((pr: Record<string, unknown>) => pr.type === 'unit');
    const price = unitPriceEntry?.amount || p.prices?.[0]?.amount || 0;
    const discountPercent = p.prices?.[0]?.discountPercent || 0;

    // Map warehouse
    const warehouseId = p.warehouse ? warehouseIdMap.get(p.warehouse.toString()) : defaultWarehouseId;

    try {
      // Extract cost price from prices array
      const costPriceEntry = (p.prices || []).find((pr: Record<string, unknown>) => pr.type === 'cost');
      const costPrice = costPriceEntry?.amount || 0;

      // Extract 3-tier discount from prices array
      const d1 = (p.prices || []).find((pr: Record<string, unknown>) => pr.type === 'discount1');
      const d2 = (p.prices || []).find((pr: Record<string, unknown>) => pr.type === 'discount2');
      const d3 = (p.prices || []).find((pr: Record<string, unknown>) => pr.type === 'discount3');

      const created = await prisma.product.create({
        data: {
          name: p.name || 'Nomi yo\'q',
          price,
          costPrice,
          dollarRate: p.dollarRate || null,
          discountPercent: discountPercent,
          discount1Qty: d1?.minQuantity || 0,
          discount1Pct: d1?.discountPercent || 0,
          discount2Qty: d2?.minQuantity || 0,
          discount2Pct: d2?.discountPercent || 0,
          discount3Qty: d3?.minQuantity || 0,
          discount3Pct: d3?.discountPercent || 0,
          stock: p.quantity || 0,
          minStock: p.minStock || 5,
          unit: mapUnit(p.unit),
          boxQuantity: p.boxInfo?.unitsPerBox || 1,
          meterPerRoll: p.metrInfo?.metersPerOram || null,
          packQuantity: p.pachkaInfo?.unitsPerPachka || null,
          warehouseId: warehouseId || null,
          categoryId,
          subCategoryId: subCategoryId || null,
          images: (p.images || []).map((img: string | { path?: string }) =>
            typeof img === 'string' ? img : (img.path || '')
          ).filter(Boolean),
          description: p.description || null,
        },
      });
      productIdMap.set(p._id.toString(), created.id);
      productCount++;
    } catch (err) {
      console.warn(`   Error migrating product "${p.name}":`, (err as Error).message);
    }
  }
  console.log(`   ${productCount}/${mongoProducts.length} products migrated`);

  // ─── 7. CUSTOMERS ───
  console.log('7. Migrating Customers...');
  const mongoCustomers = await db.collection('customers').find({}).toArray();
  const customerIdMap = new Map<string, string>();
  let custCount = 0;
  const seenPhones = new Set<string>();

  for (const c of mongoCustomers) {
    const phone = c.phone || `+998${String(custCount + 1).padStart(9, '0')}`;

    // Skip duplicate phones
    if (seenPhones.has(phone)) {
      console.warn(`   Skipping duplicate customer phone: ${phone} (${c.name})`);
      continue;
    }
    seenPhones.add(phone);

    const createdById = c.createdBy ? userIdMap.get(c.createdBy.toString()) : null;

    try {
      const created = await prisma.customer.create({
        data: {
          name: c.name || 'Nomi yo\'q',
          phone,
          email: c.email || null,
          address: c.address || null,
          loyaltyPoints: c.totalBalls || 0,
          note: null,
          createdById: createdById || adminUserId || null,
        },
      });
      customerIdMap.set(c._id.toString(), created.id);
      custCount++;
    } catch (err) {
      console.warn(`   Error migrating customer "${c.name}":`, (err as Error).message);
    }
  }
  console.log(`   ${custCount}/${mongoCustomers.length} customers migrated`);

  // ─── 8. SUPPLIERS ───
  console.log('8. Migrating Suppliers...');
  const mongoSuppliers = await db.collection('suppliers').find({}).toArray();
  const supplierIdMap = new Map<string, string>();

  for (const s of mongoSuppliers) {
    const created = await prisma.supplier.create({
      data: {
        name: s.name || 'Nomi yo\'q',
        phone: s.phone || null,
        balance: s.totalDebt || 0,
      },
    });
    supplierIdMap.set(s._id.toString(), created.id);
  }
  console.log(`   ${mongoSuppliers.length} suppliers migrated`);

  // ─── 9. CONTACTS ───
  console.log('9. Migrating Contacts...');
  const mongoContacts = await db.collection('contacts').find({}).toArray();
  let contactCount = 0;

  for (const c of mongoContacts) {
    const firstCatId = c.categories?.[0] ? contactCatIdMap.get(c.categories[0].toString()) : null;
    const createdById = c.createdBy && c.createdBy !== 'hardcoded-admin-id'
      ? userIdMap.get(c.createdBy.toString())
      : null;

    try {
      await prisma.contact.create({
        data: {
          name: c.name || 'Nomi yo\'q',
          phone: c.phone || '',
          categoryId: firstCatId || null,
          createdById: createdById || adminUserId || null,
        },
      });
      contactCount++;
    } catch (err) {
      // Skip errors (duplicate phones, etc)
    }
  }
  console.log(`   ${contactCount}/${mongoContacts.length} contacts migrated`);

  // ─── 10. EXPENSES ───
  console.log('10. Migrating Expenses...');
  const mongoExpenses = await db.collection('expenses').find({}).toArray();

  for (const e of mongoExpenses) {
    const category = mapExpenseCategory(e.category);
    await prisma.expense.create({
      data: {
        category,
        type: e.type || null,
        amount: e.amount || 0,
        description: e.note || e.description || 'Xarajat',
        date: e.date ? new Date(e.date) : new Date(),
        createdById: adminUserId,
      },
    });
  }
  console.log(`   ${mongoExpenses.length} expenses migrated`);

  // ─── 11. DEBTS ───
  console.log('11. Migrating Debts...');
  const mongoDebts = await db.collection('debts').find({}).toArray();
  let debtCount = 0;

  for (const d of mongoDebts) {
    const customerId = customerIdMap.get(d.customer?.toString());
    if (!customerId) continue;

    const createdById = d.createdBy ? userIdMap.get(d.createdBy.toString()) : adminUserId;
    const status = mapDebtStatus(d.status);
    const paidAmount = d.paidAmount || 0;
    const remainingAmount = Math.max(0, (d.amount || 0) - paidAmount);

    try {
      const created = await prisma.debt.create({
        data: {
          customerId,
          amount: d.amount || 0,
          remainingAmount,
          status,
          dueDate: d.dueDate ? new Date(d.dueDate) : new Date(),
          note: d.description || null,
          collateral: d.collateral || null,
          createdById: createdById || adminUserId,
        },
      });

      // Migrate payments
      if (d.payments && Array.isArray(d.payments)) {
        for (const pay of d.payments) {
          await prisma.debtPayment.create({
            data: {
              debtId: created.id,
              amount: pay.amount || 0,
              method: (pay.method || 'cash').toUpperCase(),
              createdById: createdById || adminUserId,
              createdAt: pay.date ? new Date(pay.date) : new Date(),
            },
          });
        }
      }

      debtCount++;
    } catch (err) {
      console.warn(`   Error migrating debt:`, (err as Error).message);
    }
  }
  console.log(`   ${debtCount}/${mongoDebts.length} debts migrated`);

  // ─── 12. SUPPLIER TRANSACTIONS ───
  console.log('12. Migrating Supplier Transactions...');
  const mongoTransactions = await db.collection('suppliertransactions').find({}).toArray();
  let txCount = 0;

  for (const t of mongoTransactions) {
    const supplierId = supplierIdMap.get(t.supplier?.toString());
    if (!supplierId) continue;

    try {
      const created = await prisma.supplierTransaction.create({
        data: {
          supplierId,
          type: 'IMPORT',
          total: t.totalAmount || 0,
          currency: 'UZS',
          rate: 1,
          note: null,
          createdById: adminUserId,
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
        },
      });

      // Migrate transaction items
      if (t.items && Array.isArray(t.items)) {
        for (const item of t.items) {
          const productId = productIdMap.get(item.product?.toString());
          if (!productId) continue;

          await prisma.supplierTransactionItem.create({
            data: {
              transactionId: created.id,
              productId,
              quantity: item.quantity || 1,
              unitPrice: item.price || 0,
              total: item.total || 0,
            },
          });
        }
      }
      txCount++;
    } catch (err) {
      console.warn(`   Error migrating transaction:`, (err as Error).message);
    }
  }
  console.log(`   ${txCount}/${mongoTransactions.length} supplier transactions migrated`);

  // ─── 13. SALARY SETTINGS ───
  console.log('13. Migrating Salary Settings...');
  const mongoSalarySettings = await db.collection('salarysettings').find({}).toArray();
  let ssCount = 0;

  for (const ss of mongoSalarySettings) {
    const userId = ss.employee ? userIdMap.get(ss.employee.toString()) : null;
    if (!userId) continue;

    try {
      await prisma.salarySetting.create({
        data: {
          userId,
          baseSalary: ss.baseSalary || 0,
          salesPercent: 0,
        },
      });
      ssCount++;
    } catch (err) {
      // Skip duplicate
    }
  }
  console.log(`   ${ssCount}/${mongoSalarySettings.length} salary settings migrated`);

  // ─── 14. DEFAULT SETTINGS ───
  console.log('14. Creating default settings...');
  const defaultSettings = [
    { key: 'storeName', value: 'Sardorbek Furnitura', type: 'string' },
    { key: 'storePhone', value: '', type: 'string' },
    { key: 'storeAddress', value: '', type: 'string' },
    { key: 'currencyRate', value: '12800', type: 'number' },
    { key: 'returnPeriodDays', value: '14', type: 'number' },
    { key: 'allowNegativeStock', value: 'true', type: 'boolean' },
    { key: 'soundEnabled', value: 'true', type: 'boolean' },
    { key: 'language', value: 'uz', type: 'string' },
  ];
  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('   Settings created');

  // ─── SUMMARY ───
  console.log('\n═══════════════════════════════════════');
  console.log('MIGRATION COMPLETE!');
  console.log('═══════════════════════════════════════');
  console.log(`Users:                ${mongoUsers.length}`);
  console.log(`Warehouses:           ${mongoWarehouses.length}`);
  console.log(`Store Locations:      ${mongoLocations.length}`);
  console.log(`Contact Categories:   ${mongoContactCats.length}`);
  console.log(`Categories:           ${mongoCategories.length}`);
  console.log(`Products:             ${productCount}/${mongoProducts.length}`);
  console.log(`Customers:            ${custCount}/${mongoCustomers.length}`);
  console.log(`Suppliers:            ${mongoSuppliers.length}`);
  console.log(`Contacts:             ${contactCount}/${mongoContacts.length}`);
  console.log(`Expenses:             ${mongoExpenses.length}`);
  console.log(`Debts:                ${debtCount}/${mongoDebts.length}`);
  console.log(`Supplier Transactions:${txCount}/${mongoTransactions.length}`);
  console.log(`Salary Settings:      ${ssCount}/${mongoSalarySettings.length}`);
  console.log('═══════════════════════════════════════\n');

  await mongoose.disconnect();
  await prisma.$disconnect();
}

// ─── HELPERS ───

function mapUnit(unit: string): 'PIECE' | 'KG' | 'METER' | 'SET' | 'PACK' | 'BOX' {
  const u = (unit || '').toLowerCase();
  if (u.includes('kg')) return 'KG';
  if (u.includes('metr') || u.includes('meter')) return 'METER';
  if (u.includes('set') || u.includes('kompl')) return 'SET';
  if (u.includes('pachka') || u.includes('pack')) return 'PACK';
  if (u.includes('quti') || u.includes('box')) return 'BOX';
  return 'PIECE';
}

function mapExpenseCategory(cat: string): string {
  const c = (cat || '').toLowerCase();
  if (c.includes('komunal') || c.includes('elektr') || c.includes('suv') || c.includes('gaz')) return 'UTILITIES';
  if (c.includes('ijara') || c.includes('rent')) return 'RENT';
  if (c.includes('maosh') || c.includes('salary')) return 'SALARY';
  if (c.includes('transport') || c.includes('yetkazish')) return 'TRANSPORT';
  if (c.includes('reklama') || c.includes('marketing')) return 'MARKETING';
  if (c.includes('ta\'mir') || c.includes('repair')) return 'REPAIR';
  if (c.includes('soliq') || c.includes('tax')) return 'TAX';
  return 'OTHER';
}

function mapDebtStatus(status: string): 'ACTIVE' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CONFLICT' {
  const s = (status || '').toLowerCase();
  if (s === 'paid' || s === 'to\'langan') return 'PAID';
  if (s === 'partial') return 'PARTIAL';
  if (s === 'overdue') return 'OVERDUE';
  return 'ACTIVE';
}

// ─── RUN ───
clearDatabase()
  .then(() => migrate())
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
