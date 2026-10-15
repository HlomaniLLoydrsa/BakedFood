import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';

async function seed() {
  console.log('🌱 Seeding database...');

  // Clean up
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.dropProduct.deleteMany();
  await prisma.drop.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();

  // Admin user
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
  const admin = await prisma.user.create({
    data: {
      name: process.env.ADMIN_NAME || 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@droply.co',
      passwordHash,
      role: 'admin',
    },
  });
  console.log(`✅ Admin user: ${admin.email} / ${process.env.ADMIN_PASSWORD || 'admin123'}`);

  // Business settings
  await prisma.setting.createMany({
    data: [
      { key: 'businessName', value: 'The Good Batch' },
      { key: 'businessPhone', value: '+27 82 555 1234' },
      { key: 'businessWhatsapp', value: '+27 82 555 1234' },
      { key: 'businessEmail', value: 'hello@thegoodbatch.co.za' },
      { key: 'businessAddress', value: 'Cape Town, Western Cape' },
      { key: 'bankName', value: 'FNB' },
      { key: 'bankAccountHolder', value: 'The Good Batch' },
      { key: 'bankAccountNumber', value: '62012345678' },
      { key: 'bankBranchCode', value: '250655' },
      { key: 'bankAccountType', value: 'Cheque / Current' },
      { key: 'eftInstructions', value: 'Please use your order number as your payment reference. Payment must be made within 24 hours of placing your order.' },
      { key: 'deliveryEnabled', value: 'true' },
      { key: 'collectionEnabled', value: 'true' },
      { key: 'deliveryInstructions', value: 'We deliver across Cape Town. Delivery fee applies. You will be contacted to confirm your delivery slot.' },
      { key: 'collectionInstructions', value: 'Collection from Claremont, Cape Town. You will receive a WhatsApp message when your order is ready for collection.' },
    ],
  });
  console.log('✅ Business settings created');

  // Categories
  const categoryNames = ['Biltong', 'Baked Goods', 'Snacks', 'Drinks', 'Meat', 'Desserts', 'Other'];
  const categories = await Promise.all(
    categoryNames.map((name) => prisma.category.create({ data: { name } }))
  );
  const catMap = Object.fromEntries(categories.map((c) => [c.name, c]));
  console.log('✅ Categories created');

  // Products
  const biltong = await prisma.product.create({
    data: {
      name: 'Beef Biltong',
      description: 'Premium quality beef biltong, traditionally cured and sliced to perfection. Made from the finest cuts of beef with a blend of spices.',
      categoryId: catMap['Biltong'].id,
      price: 70.00,
      sellingUnit: '200g',
      isAvailable: true,
    },
  });

  const brownies = await prisma.product.create({
    data: {
      name: 'Homemade Brownies',
      description: 'Rich, fudgy homemade chocolate brownies baked fresh. Made with Belgian chocolate for an indulgent treat.',
      categoryId: catMap['Baked Goods'].id,
      price: 60.00,
      sellingUnit: 'box',
      isAvailable: true,
    },
  });

  const malva = await prisma.product.create({
    data: {
      name: 'Malva Pudding',
      description: 'Traditional South African malva pudding, warm and smothered in a sweet apricot sauce. A classic comfort dessert.',
      categoryId: catMap['Desserts'].id,
      price: 80.00,
      sellingUnit: 'portion',
      isAvailable: true,
    },
  });

  const cookies = await prisma.product.create({
    data: {
      name: 'Homemade Cookies',
      description: 'Freshly baked homemade cookies. A mix of chocolate chip, oat & raisin, and peanut butter — 12 per pack.',
      categoryId: catMap['Baked Goods'].id,
      price: 45.00,
      sellingUnit: 'pack',
      isAvailable: true,
    },
  });

  console.log('✅ Products created');

  // Drop — set relative to "now" so it's already open
  const now = new Date();
  const opensAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);   // opened 2 hours ago
  const closesAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // closes in 48 hours

  const drop = await prisma.drop.create({
    data: {
      name: 'Weekend Food Drop',
      slug: 'weekend-food-drop',
      description: 'Fresh products available this weekend. Order by Sunday evening — collection and delivery available.',
      opensAt,
      closesAt,
      allowDelivery: true,
      allowCollection: true,
      allowEft: true,
      allowCash: true,
      dropProducts: {
        create: [
          { productId: biltong.id, price: 70.00 },
          { productId: brownies.id, price: 60.00 },
          { productId: malva.id, price: 80.00 },
          { productId: cookies.id, price: 45.00 },
        ],
      },
    },
  });
  console.log(`✅ Drop created: ${drop.name} (slug: ${drop.slug})`);

  // Demo orders
  interface DemoOrder {
    orderNumber: string;
    customerName: string;
    phone: string;
    email: string | null;
    fulfilmentMethod: string;
    deliveryAddress: string | null;
    paymentMethod: string;
    paymentStatus: string;
    orderStatus: string;
    items: Array<{ product: typeof biltong; qty: number }>;
  }

  const orderData: DemoOrder[] = [
    {
      orderNumber: 'DROP-1001',
      customerName: 'John van der Berg',
      phone: '+27 82 111 2222',
      email: 'john@example.com',
      fulfilmentMethod: 'DELIVERY',
      deliveryAddress: '14 Oak Street, Claremont, Cape Town, 7708',
      paymentMethod: 'EFT',
      paymentStatus: 'PAYMENT_VERIFIED',
      orderStatus: 'CONFIRMED',
      items: [
        { product: biltong, qty: 2 },
        { product: brownies, qty: 1 },
      ],
    },
    {
      orderNumber: 'DROP-1002',
      customerName: 'Sarah Botha',
      phone: '+27 83 333 4444',
      email: 'sarah@example.com',
      fulfilmentMethod: 'COLLECTION',
      deliveryAddress: null,
      paymentMethod: 'CASH',
      paymentStatus: 'CASH_PENDING',
      orderStatus: 'CONFIRMED',
      items: [
        { product: malva, qty: 2 },
        { product: cookies, qty: 1 },
      ],
    },
    {
      orderNumber: 'DROP-1003',
      customerName: 'Mike Steyn',
      phone: '+27 84 555 6666',
      email: null,
      fulfilmentMethod: 'DELIVERY',
      deliveryAddress: '7 Pine Avenue, Rondebosch, Cape Town, 7700',
      paymentMethod: 'EFT',
      paymentStatus: 'POP_SUBMITTED',
      orderStatus: 'PENDING',
      items: [
        { product: cookies, qty: 3 },
        { product: biltong, qty: 1 },
      ],
    },
    {
      orderNumber: 'DROP-1004',
      customerName: 'Priya Naidoo',
      phone: '+27 76 777 8888',
      email: 'priya@example.com',
      fulfilmentMethod: 'DELIVERY',
      deliveryAddress: '22 Rose Lane, Wynberg, Cape Town, 7800',
      paymentMethod: 'EFT',
      paymentStatus: 'PAYMENT_VERIFIED',
      orderStatus: 'PREPARING',
      items: [
        { product: brownies, qty: 2 },
        { product: malva, qty: 1 },
        { product: cookies, qty: 2 },
      ],
    },
    {
      orderNumber: 'DROP-1005',
      customerName: 'Sipho Dlamini',
      phone: '+27 71 999 0000',
      email: null,
      fulfilmentMethod: 'COLLECTION',
      deliveryAddress: null,
      paymentMethod: 'CASH',
      paymentStatus: 'CASH_RECEIVED',
      orderStatus: 'READY',
      items: [
        { product: biltong, qty: 3 },
        { product: brownies, qty: 1 },
      ],
    },
  ];

  for (const od of orderData) {
    let total = 0;
    const itemsData = od.items.map((i) => {
      const unitPrice = i.product.price;
      const subtotal = unitPrice * i.qty;
      total += subtotal;
      return {
        productId: i.product.id,
        productNameSnapshot: i.product.name,
        sellingUnitSnapshot: i.product.sellingUnit,
        quantity: i.qty,
        unitPrice,
        subtotal,
      };
    });

    const isVerified = od.paymentStatus === 'PAYMENT_VERIFIED' || od.paymentStatus === 'CASH_RECEIVED';

    await prisma.order.create({
      data: {
        orderNumber: od.orderNumber,
        dropId: drop.id,
        customerName: od.customerName,
        phone: od.phone,
        email: od.email,
        fulfilmentMethod: od.fulfilmentMethod,
        deliveryAddress: od.deliveryAddress,
        totalAmount: total,
        paymentMethod: od.paymentMethod,
        paymentStatus: od.paymentStatus,
        orderStatus: od.orderStatus,
        orderItems: { create: itemsData },
        payment: {
          create: {
            paymentMethod: od.paymentMethod,
            reference: od.orderNumber,
            amount: total,
            status: od.paymentStatus,
            verifiedById: isVerified ? admin.id : null,
            verifiedAt: isVerified ? new Date() : null,
          },
        },
      },
    });
  }

  console.log('✅ Demo orders created');
  console.log('\n🎉 Seed complete!');
  console.log(`\nAdmin login: ${process.env.ADMIN_EMAIL || 'admin@droply.co'} / ${process.env.ADMIN_PASSWORD || 'admin123'}`);
  console.log(`Demo drop:   http://localhost:5173/drop/weekend-food-drop`);
  console.log(`Admin:       http://localhost:5173/admin`);
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
