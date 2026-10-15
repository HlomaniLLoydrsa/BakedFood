import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { generateSlug, ensureUniqueSlug } from '../lib/slug';

const router = Router();

const dropSchema = z.object({
  name: z.string().min(1, 'Drop name is required').max(200),
  description: z.string().max(1000).optional(),
  opensAt: z.string().datetime({ message: 'Invalid opening date/time' }),
  closesAt: z.string().datetime({ message: 'Invalid closing date/time' }),
  allowDelivery: z.boolean().default(true),
  allowCollection: z.boolean().default(true),
  allowEft: z.boolean().default(true),
  allowCash: z.boolean().default(true),
  productIds: z.array(z.string()).min(1, 'Select at least one product'),
  productSettings: z
    .array(
      z.object({
        productId: z.string(),
        price: z.number().positive(),
        maxQuantity: z.number().int().positive().optional().nullable(),
      })
    )
    .optional(),
});

function computeDropStatus(drop: { opensAt: Date | string; closesAt: Date | string; status: string }): string {
  const now = new Date();
  const opens = new Date(drop.opensAt);
  const closes = new Date(drop.closesAt);
  if (drop.status === 'CANCELLED') return 'CANCELLED';
  if (drop.status === 'CLOSED') return 'CLOSED';
  if (now < opens) return 'SCHEDULED';
  if (now >= opens && now < closes) return 'OPEN';
  return 'CLOSED';
}

// GET /api/drops
router.get('/', async (_req: Request, res: Response) => {
  const drops = await prisma.drop.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      dropProducts: {
        include: { product: { select: { id: true, name: true, imageUrl: true, sellingUnit: true } } },
      },
      _count: { select: { orders: true } },
    },
  });

  const dropsWithStatus = drops.map((d) => ({
    ...d,
    computedStatus: computeDropStatus(d),
  }));

  res.json({ drops: dropsWithStatus });
});

// GET /api/drops/public/:slug  — must be before /:id
router.get('/public/:slug', async (req: Request, res: Response) => {
  const drop = await prisma.drop.findUnique({
    where: { slug: req.params.slug },
    include: {
      dropProducts: {
        include: {
          product: {
            include: { category: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!drop) throw new AppError('Drop not found', 404);

  const computedStatus = computeDropStatus(drop);

  const orderedQuantities = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: { dropId: drop.id, orderStatus: { not: 'CANCELLED' } },
    },
    _sum: { quantity: true },
  });

  const qtyMap: Record<string, number> = {};
  orderedQuantities.forEach((r) => { qtyMap[r.productId] = r._sum.quantity || 0; });

  const dropProducts = drop.dropProducts.map((dp) => {
    const ordered = qtyMap[dp.productId] || 0;
    const maxQty = dp.maxQuantity ?? dp.product.maxQuantity;
    const remaining = maxQty != null ? Math.max(0, maxQty - ordered) : null;
    return { ...dp, orderedQty: ordered, remaining, isSoldOut: remaining !== null ? remaining <= 0 : false };
  });

  res.json({ drop: { ...drop, dropProducts, computedStatus } });
});

// GET /api/drops/:id
router.get('/:id', async (req: Request, res: Response) => {
  const drop = await prisma.drop.findUnique({
    where: { id: req.params.id },
    include: { dropProducts: { include: { product: true } }, _count: { select: { orders: true } } },
  });
  if (!drop) throw new AppError('Drop not found', 404);
  res.json({ drop: { ...drop, computedStatus: computeDropStatus(drop) } });
});

// POST /api/drops
router.post('/', async (req: Request, res: Response) => {
  const data = dropSchema.parse(req.body);

  if (new Date(data.closesAt) <= new Date(data.opensAt)) {
    throw new AppError('Closing time must be after opening time', 400);
  }

  const products = await prisma.product.findMany({ where: { id: { in: data.productIds } } });
  if (products.length !== data.productIds.length) throw new AppError('One or more products not found', 400);

  const baseSlug = generateSlug(data.name);
  const slug = await ensureUniqueSlug(baseSlug);

  const drop = await prisma.drop.create({
    data: {
      name: data.name, slug, description: data.description,
      opensAt: new Date(data.opensAt), closesAt: new Date(data.closesAt),
      allowDelivery: data.allowDelivery, allowCollection: data.allowCollection,
      allowEft: data.allowEft, allowCash: data.allowCash,
      dropProducts: {
        create: data.productIds.map((productId) => {
          const product = products.find((p) => p.id === productId)!;
          const settings = data.productSettings?.find((s) => s.productId === productId);
          return { productId, price: settings?.price ?? Number(product.price), maxQuantity: settings?.maxQuantity ?? product.maxQuantity };
        }),
      },
    },
    include: { dropProducts: { include: { product: true } } },
  });

  res.status(201).json({ drop: { ...drop, computedStatus: computeDropStatus(drop) } });
});

// PUT /api/drops/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = dropSchema.parse(req.body);

  const existing = await prisma.drop.findUnique({ where: { id } });
  if (!existing) throw new AppError('Drop not found', 404);

  if (new Date(data.closesAt) <= new Date(data.opensAt)) {
    throw new AppError('Closing time must be after opening time', 400);
  }

  const products = await prisma.product.findMany({ where: { id: { in: data.productIds } } });
  if (products.length !== data.productIds.length) throw new AppError('One or more products not found', 400);

  let slug = existing.slug;
  if (data.name !== existing.name) {
    const baseSlug = generateSlug(data.name);
    slug = await ensureUniqueSlug(baseSlug, id);
  }

  await prisma.dropProduct.deleteMany({ where: { dropId: id } });

  const drop = await prisma.drop.update({
    where: { id },
    data: {
      name: data.name, slug, description: data.description,
      opensAt: new Date(data.opensAt), closesAt: new Date(data.closesAt),
      allowDelivery: data.allowDelivery, allowCollection: data.allowCollection,
      allowEft: data.allowEft, allowCash: data.allowCash,
      dropProducts: {
        create: data.productIds.map((productId) => {
          const product = products.find((p) => p.id === productId)!;
          const settings = data.productSettings?.find((s) => s.productId === productId);
          return { productId, price: settings?.price ?? Number(product.price), maxQuantity: settings?.maxQuantity ?? product.maxQuantity };
        }),
      },
    },
    include: { dropProducts: { include: { product: true } } },
  });

  res.json({ drop: { ...drop, computedStatus: computeDropStatus(drop) } });
});

// POST /api/drops/:id/close
router.post('/:id/close', async (req: Request, res: Response) => {
  const { id } = req.params;
  const drop = await prisma.drop.findUnique({ where: { id } });
  if (!drop) throw new AppError('Drop not found', 404);
  const updated = await prisma.drop.update({ where: { id }, data: { status: 'CLOSED' } });
  res.json({ drop: { ...updated, computedStatus: 'CLOSED' } });
});

// POST /api/drops/:id/duplicate
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const drop = await prisma.drop.findUnique({ where: { id }, include: { dropProducts: true } });
  if (!drop) throw new AppError('Drop not found', 404);

  const newName = `${drop.name} (Copy)`;
  const slug = await ensureUniqueSlug(generateSlug(newName));
  const now = new Date();

  const newDrop = await prisma.drop.create({
    data: {
      name: newName, slug, description: drop.description,
      opensAt: now, closesAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      allowDelivery: drop.allowDelivery, allowCollection: drop.allowCollection,
      allowEft: drop.allowEft, allowCash: drop.allowCash,
      status: 'DRAFT',
      dropProducts: {
        create: drop.dropProducts.map((dp) => ({
          productId: dp.productId, price: dp.price, maxQuantity: dp.maxQuantity,
        })),
      },
    },
    include: { dropProducts: { include: { product: true } } },
  });

  res.status(201).json({ drop: { ...newDrop, computedStatus: computeDropStatus(newDrop) } });
});

// DELETE /api/drops/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const drop = await prisma.drop.findUnique({ where: { id } });
  if (!drop) throw new AppError('Drop not found', 404);

  const hasOrders = await prisma.order.count({ where: { dropId: id } });
  if (hasOrders > 0) throw new AppError('Cannot delete a drop that has orders', 400);

  await prisma.drop.delete({ where: { id } });
  res.json({ message: 'Drop deleted' });
});

// GET /api/drops/:id/demand
router.get('/:id/demand', async (req: Request, res: Response) => {
  const { id } = req.params;
  const drop = await prisma.drop.findUnique({ where: { id } });
  if (!drop) throw new AppError('Drop not found', 404);

  const demand = await prisma.orderItem.groupBy({
    by: ['productId', 'productNameSnapshot', 'sellingUnitSnapshot'],
    where: { order: { dropId: id, orderStatus: { not: 'CANCELLED' } } },
    _sum: { quantity: true, subtotal: true },
    _count: { orderId: true },
  });

  res.json({ demand });
});

export default router;
