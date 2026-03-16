import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Default Admin user
  const adminPassword = await bcrypt.hash('admin1234', 12);
  const admin = await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      login: 'admin',
      password: adminPassword,
      name: 'Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`Admin created: ${admin.login} (${admin.id})`);

  // Default Settings
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

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`Settings created: ${defaultSettings.length} items`);

  console.log('Seed completed!');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
