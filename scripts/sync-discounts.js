#!/usr/bin/env node
// MongoDB dan barcha mahsulotlarning chegirma darajalarini PostgreSQL ga sync qilish
// Ishga tushirish: cd apps/api && node ../../scripts/sync-discounts.js

const { PrismaClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb+srv://ozodbekweb011_db_user:pPZfsDeWMONS0dz0@nazorat1.kcvyamy.mongodb.net/nazorat?retryWrites=true&w=majority&appName=nazorat1&ssl=true&serverSelectionTimeoutMS=15000';
const PG_URL = 'postgresql://postgres:2410@localhost:5432/sardorbek_db';

const prisma = new PrismaClient({ datasourceUrl: PG_URL });

(async () => {
  // Connect MongoDB
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db('nazorat');
  console.log('MongoDB connected');

  // Get all products with discount tiers
  const mongoProducts = await db.collection('products').find({
    'prices.2': { $exists: true } // Has at least 3 prices (cost + unit + discount1)
  }).toArray();

  console.log(`MongoDB: ${mongoProducts.length} ta mahsulotda chegirma bor\n`);

  let updated = 0;
  let notFound = 0;

  for (const mp of mongoProducts) {
    const d1 = mp.prices?.find(p => p.type === 'discount1');
    const d2 = mp.prices?.find(p => p.type === 'discount2');
    const d3 = mp.prices?.find(p => p.type === 'discount3');

    if (!d1 && !d2 && !d3) continue;

    // Find in PostgreSQL
    const pgProduct = await prisma.product.findFirst({ where: { name: mp.name } });
    if (!pgProduct) {
      notFound++;
      continue;
    }

    const data = {};
    if (d1 && d1.minQuantity > 0 && d1.discountPercent > 0) {
      data.discount1Qty = d1.minQuantity;
      data.discount1Pct = d1.discountPercent;
    }
    if (d2 && d2.minQuantity > 0 && d2.discountPercent > 0) {
      data.discount2Qty = d2.minQuantity;
      data.discount2Pct = d2.discountPercent;
    }
    if (d3 && d3.minQuantity > 0 && d3.discountPercent > 0) {
      data.discount3Qty = d3.minQuantity;
      data.discount3Pct = d3.discountPercent;
    }

    if (Object.keys(data).length > 0) {
      await prisma.product.update({ where: { id: pgProduct.id }, data });
      updated++;
      console.log(`✓ ${mp.name}: ${JSON.stringify(data)}`);
    }
  }

  console.log(`\n=== NATIJA ===`);
  console.log(`Yangilangan: ${updated} ta`);
  console.log(`Topilmagan: ${notFound} ta`);

  // Final stats
  const total = await prisma.product.count();
  const withDiscount = await prisma.product.count({ where: { discount1Qty: { gt: 0 } } });
  console.log(`Jami: ${total} | Chegirmali: ${withDiscount}`);

  await mongo.close();
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
