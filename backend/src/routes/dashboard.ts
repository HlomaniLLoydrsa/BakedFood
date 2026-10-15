import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/dashboard
router.get('/', async (_req: Request, res: Response) => {
  const now = new Date();

  const activeDrops = await prisma.drop.findMany({
    where: {
      status: { not: 'CANCELLED' },
      opensAt: { lte: now },
      closesAt: { gt: now },
    },
    include: {
      _count: { select: { orders: true } },
      dropProducts: { include: { product: { select: { name: true, sellingUnit: true } } } },
    },
  });

  const dropStats = await Promise.all(
    activeDrops.map(async (drop) => {
      const orders = await prisma.order.findMany({
        where: { dropId: drop.id, orderStatus: { not: 'CANCELLED' } },
        include: { orderItems: true },
      });

      const totalOrders = orders.length;
      const totalUnits = orders.reduce((sum, o) => sum + o.orderItems.reduce((s, i) => s + i.quantity, 0), 0);
      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      const verifiedRevenue = orders.filter((o) => o.paymentStatus === 'PAYMENT_VERIFIED').reduce((sum, o) => sum + Number(o.totalAmount), 0);
      const popPendingRevenue = orders.filter((o) => o.paymentStatus === 'POP_SUBMITTED').reduce((sum, o) => sum + Number(o.totalAmount), 0);
      const cashPendingRevenue = orders.filter((o) => o.paymentStatus === 'CASH_PENDING').reduce((sum, o) => sum + Number(o.totalAmount), 0);

      const demandMap: Record<string, { name: string; unit: string; qty: number }> = {};
      orders.forEach((order) => {
        order.orderItems.forEach((item) => {
          if (!demandMap[item.productId]) {
            demandMap[item.productId] = { name: item.productNameSnapshot, unit: item.sellingUnitSnapshot, qty: 0 };
          }
          demandMap[item.productId].qty += item.quantity;
        });
      });

      return { ...drop, totalOrders, totalUnits, totalRevenue, verifiedRevenue, popPendingRevenue, cashPendingRevenue, demand: Object.values(demandMap) };
    })
  );

  const allTimeOrders = await prisma.order.count({ where: { orderStatus: { not: 'CANCELLED' } } });
  const allTimeRevenue = await prisma.order.aggregate({
    where: { orderStatus: { not: 'CANCELLED' } },
    _sum: { totalAmount: true },
  });

  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { orderItems: true, drop: { select: { name: true } } },
  });

  res.json({ activeDrops: dropStats, allTimeOrders, allTimeRevenue: Number(allTimeRevenue._sum.totalAmount || 0), recentOrders });
});

export default router;
