import 'dotenv/config';
import { prisma } from './lib/prisma';

async function clear() {
  console.log('Clearing demo data...');
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.dropProduct.deleteMany();
  await prisma.drop.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  // Keep: users, settings
  console.log('✅ All demo data cleared. Users and settings preserved.');
  await prisma.$disconnect();
}

clear().catch((e) => { console.error(e); process.exit(1); });
