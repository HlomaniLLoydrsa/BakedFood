import 'dotenv/config';
import { prisma } from './lib/prisma';

async function check() {
  const products = await prisma.product.findMany({ include: { category: true } });
  const drops = await prisma.drop.count();
  const orders = await prisma.order.count();
  const categories = await prisma.category.findMany();

  console.log('\n=== DATABASE STATUS ===');
  console.log(`Products:   ${products.length}`);
  console.log(`Drops:      ${drops}`);
  console.log(`Orders:     ${orders}`);
  console.log(`Categories: ${categories.length}`);

  if (products.length > 0) {
    console.log('\n--- Products ---');
    products.forEach((p) => console.log(`  ${p.name} — R${p.price} / ${p.sellingUnit}`));
  }
  if (categories.length > 0) {
    console.log('\n--- Categories ---');
    categories.forEach((c) => console.log(`  ${c.name}`));
  }

  await prisma.$disconnect();
}

check().catch(console.error);
