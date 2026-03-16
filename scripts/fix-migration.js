// Fix: 4 ta qolgan mahsulot + chegirma darajalari yangilash
// Ishga tushirish: cd apps/api && node ../../scripts/fix-migration.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:2410@localhost:5432/sardorbek_db',
});

// MongoDB dan olingan 4 ta qolgan mahsulot (kategoriyasi yo'q edi)
const MISSING_PRODUCTS = [
  { name: 'Test Product 1', price: 0, costPrice: 0, stock: 0, note: 'Kategoriyasiz mahsulot' },
  { name: 'Test Product 2', price: 0, costPrice: 0, stock: 0, note: 'Kategoriyasiz mahsulot' },
  { name: 'Test Product 3', price: 0, costPrice: 0, stock: 0, note: 'Kategoriyasiz mahsulot' },
  { name: 'Test Product 4', price: 0, costPrice: 0, stock: 0, note: 'Kategoriyasiz mahsulot' },
];

// MongoDB dan olingan chegirma ma'lumotlari
const DISCOUNT_DATA = [
  { name: 'Teddy-31', d1: { qty: 10, pct: 3 }, d2: { qty: 11, pct: 5 }, d3: { qty: 20, pct: 10 } },
  { name: 'Samarez 4sm', d1: { qty: 1, pct: 5 }, d2: { qty: 5, pct: 7 }, d3: { qty: 10, pct: 10 } },
  { name: '3228 tilla ruchka 3.2', d1: { qty: 11, pct: 2 }, d2: { qty: 21, pct: 4 }, d3: { qty: 50, pct: 7 } },
  { name: 'Vishifka eko rombik qizil', d1: { qty: 11, pct: 5 }, d2: { qty: 21, pct: 7 }, d3: { qty: 42, pct: 10 } },
  { name: 'Machalka 17p 4sm', d1: { qty: 15, pct: 1 }, d2: { qty: 20, pct: 2 }, d3: { qty: 50, pct: 3 } },
];

(async () => {
  console.log('=== CHEGIRMA YANGILASH ===');
  let updated = 0;

  for (const d of DISCOUNT_DATA) {
    const product = await prisma.product.findFirst({ where: { name: d.name } });
    if (!product) {
      console.log('TOPILMADI: ' + d.name);
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: {
        discount1Qty: d.d1.qty,
        discount1Pct: d.d1.pct,
        discount2Qty: d.d2.qty,
        discount2Pct: d.d2.pct,
        discount3Qty: d.d3.qty,
        discount3Pct: d.d3.pct,
      },
    });
    updated++;
    console.log('✓ ' + d.name + ': ' + d.d1.qty + '+→' + d.d1.pct + '%, ' + d.d2.qty + '+→' + d.d2.pct + '%, ' + d.d3.qty + '+→' + d.d3.pct + '%');
  }

  console.log('\nYangilangan: ' + updated + ' ta');

  // Verify
  const total = await prisma.product.count();
  const withDiscount = await prisma.product.count({ where: { discount1Qty: { gt: 0 } } });
  console.log('Jami: ' + total + ' | Chegirmali: ' + withDiscount);

  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
