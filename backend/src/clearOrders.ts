import 'dotenv/config';
import { prisma } from './lib/prisma';

async function clear() {
  console.log('Clearing all orders & payments...');
  const payments = await prisma.payment.deleteMany();
  const items = await prisma.orderItem.deleteMany();
  const orders = await prisma.order.deleteMany();
  console.log(`✅ Deleted ${orders.count} orders, ${items.count} order items, ${payments.count} payments.`);
  console.log('Products, store and settings kept.');
  await prisma.$disconnect();
}

clear().catch((e) => { console.error(e); process.exit(1); });
