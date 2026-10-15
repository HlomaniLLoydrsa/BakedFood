import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { generateSlug } from '../lib/slug';

const router = Router();

const STORE_SLUG_KEY = 'store_slug';

// ── Generate a unique slug from a name with a short random suffix ─────────
function generateUniqueSlug(name: string): string {
  const base = generateSlug(name);
  const suffix = Math.random().toString(36).slice(2, 6); // e.g. "x7k2"
  return `${base}-${suffix}`;
}

// ── Helper: get or create the one persistent drop ────────────────────────
async function getOrCreateStore() {
  // Find slug stored in settings
  const slugSetting = await prisma.setting.findUnique({ where: { key: STORE_SLUG_KEY } });

  if (slugSetting?.value) {
    const drop = await prisma.drop.findUnique({
      where: { slug: slugSetting.value },
      include: { dropProducts: { include: { product: true } }, _count: { select: { orders: true } } },
    });
    if (drop) return drop;
  }

  // Create the store for the first time
  const slug = generateUniqueSlug('our-store');
  const now = new Date();
  const drop = await prisma.drop.create({
    data: {
      name: 'Our Store',
      slug,
      description: '',
      opensAt: now,
      closesAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      status: 'CLOSED', // starts closed
      allowDelivery: true,
      allowCollection: true,
      allowEft: true,
      allowCash: true,
    },
    include: { dropProducts: { include: { product: true } }, _count: { select: { orders: true } } },
  });

  // Save the slug
  await prisma.setting.upsert({
    where: { key: STORE_SLUG_KEY },
    update: { value: slug },
    create: { key: STORE_SLUG_KEY, value: slug },
  });

  return drop;
}

// ── Sync drop products with all currently available products ─────────────
async function syncStoreProducts(dropId: string) {
  const available = await prisma.product.findMany({ where: { isAvailable: true } });

  // Remove products that are no longer available
  await prisma.dropProduct.deleteMany({
    where: {
      dropId,
      productId: { notIn: available.map((p) => p.id) },
    },
  });

  // Add any newly available products not yet in the store
  const existing = await prisma.dropProduct.findMany({ where: { dropId } });
  const existingIds = new Set(existing.map((dp) => dp.productId));

  for (const product of available) {
    if (!existingIds.has(product.id)) {
      await prisma.dropProduct.create({
        data: { dropId, productId: product.id, price: product.price },
      });
    }
  }
}

// ── GET /api/store ────────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  const store = await getOrCreateStore();
  const now = new Date();

  // Compute live status
  const isOpen =
    store.status !== 'CLOSED' &&
    store.status !== 'CANCELLED' &&
    now >= new Date(store.opensAt) &&
    now < new Date(store.closesAt);

  res.json({
    store: {
      ...store,
      isOpen,
      totalOrders: store._count.orders,
    },
  });
});

// ── PUT /api/store ────────────────────────────────────────────────────────
// Updates name, description, opensAt, closesAt, and open status
router.put('/', async (req: Request, res: Response) => {
  const schema = z.object({
    name:        z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    opensAt:     z.string().datetime().optional(),
    closesAt:    z.string().datetime().optional(),
    isOpen:      z.boolean().optional(),
  });

  const data = schema.parse(req.body);
  const store = await getOrCreateStore();

  // Validate times if both provided
  const newOpens  = data.opensAt  ? new Date(data.opensAt)  : new Date(store.opensAt);
  const newCloses = data.closesAt ? new Date(data.closesAt) : new Date(store.closesAt);
  if (newCloses <= newOpens) throw new AppError('Closing time must be after opening time', 400);

  // Determine status
  let status = store.status;
  if (data.isOpen === true)  status = 'OPEN';
  if (data.isOpen === false) status = 'CLOSED';

  // Sync products before opening
  if (data.isOpen === true) {
    await syncStoreProducts(store.id);
  }

  // Regenerate slug if name changed
  const newName = data.name ?? store.name;
  let newSlug = store.slug;
  if (data.name && data.name !== store.name) {
    newSlug = generateUniqueSlug(data.name);
    // Update the stored slug reference
    await prisma.setting.upsert({
      where: { key: STORE_SLUG_KEY },
      update: { value: newSlug },
      create: { key: STORE_SLUG_KEY, value: newSlug },
    });
  }

  const updated = await prisma.drop.update({
    where: { id: store.id },
    data: {
      name:        newName,
      slug:        newSlug,
      description: data.description !== undefined ? data.description : store.description,
      opensAt:     newOpens,
      closesAt:    newCloses,
      status,
    },
    include: { dropProducts: { include: { product: true } }, _count: { select: { orders: true } } },
  });

  const now = new Date();
  const isOpen =
    updated.status !== 'CLOSED' &&
    updated.status !== 'CANCELLED' &&
    now >= new Date(updated.opensAt) &&
    now < new Date(updated.closesAt);

  res.json({ store: { ...updated, isOpen, totalOrders: updated._count.orders } });
});

// ── GET /api/store/public ─────────────────────────────────────────────────
// Used by customer-facing drop page (same as /api/drops/public/:slug but auto-finds the store)
router.get('/public', async (_req: Request, res: Response) => {
  const store = await getOrCreateStore();

  // Always sync products so store is up to date
  await syncStoreProducts(store.id);

  // Re-fetch with fresh products
  const fresh = await prisma.drop.findUnique({
    where: { id: store.id },
    include: {
      dropProducts: {
        include: { product: { include: { category: { select: { id: true, name: true } } } } },
      },
    },
  });

  if (!fresh) throw new AppError('Store not found', 404);

  const now = new Date();
  const computedStatus =
    fresh.status === 'CANCELLED' ? 'CANCELLED' :
    fresh.status === 'CLOSED'    ? 'CLOSED'    :
    now < fresh.opensAt          ? 'SCHEDULED' :
    now >= fresh.opensAt && now < fresh.closesAt ? 'OPEN' : 'CLOSED';

  // Ordered quantities
  const ordered = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { order: { dropId: fresh.id, orderStatus: { not: 'CANCELLED' } } },
    _sum: { quantity: true },
  });
  const qtyMap: Record<string, number> = {};
  ordered.forEach((r) => { qtyMap[r.productId] = r._sum.quantity || 0; });

  const dropProducts = fresh.dropProducts.map((dp) => {
    const orderedQty = qtyMap[dp.productId] || 0;
    const maxQty = dp.maxQuantity ?? dp.product.maxQuantity;
    const remaining = maxQty != null ? Math.max(0, maxQty - orderedQty) : null;
    return { ...dp, orderedQty, remaining, isSoldOut: remaining !== null ? remaining <= 0 : false };
  });

  res.json({ drop: { ...fresh, dropProducts, computedStatus } });
});

export default router;
