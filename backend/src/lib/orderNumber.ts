import { prisma } from './prisma';

export async function generateOrderNumber(): Promise<string> {
  // Find the highest existing order number
  const lastOrder = await prisma.order.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true },
  });

  let nextNum = 1000;
  if (lastOrder) {
    const match = lastOrder.orderNumber.match(/DROP-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1]) + 1;
    }
  }

  return `DROP-${nextNum}`;
}
