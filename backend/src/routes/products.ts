import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { uploadProductImage } from '../lib/storage';
import { AppError } from '../middleware/errorHandler';
import { deleteFile } from '../lib/storage';

const router = Router();

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.string().optional(),
  price: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Price must be a positive number'),
  sellingUnit: z.string().min(1, 'Selling unit is required').max(50),
  maxQuantity: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  isAvailable: z.string().optional().transform(v => v !== 'false'),
});

// GET /api/products
router.get('/', async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { category: { select: { id: true, name: true } } },
  });
  res.json({ products });
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!product) throw new AppError('Product not found', 404);
  res.json({ product });
});

// POST /api/products
router.post('/', uploadProductImage.single('image'), async (req: Request, res: Response) => {
  const data = productSchema.parse(req.body);

  let imageUrl: string | undefined;
  if (req.file) {
    imageUrl = `/uploads/products/${req.file.filename}`;
  }

  if (data.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!cat) throw new AppError('Invalid category', 400);
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      description: data.description,
      imageUrl,
      categoryId: data.categoryId || null,
      price: parseFloat(data.price),
      sellingUnit: data.sellingUnit,
      maxQuantity: data.maxQuantity,
      isAvailable: data.isAvailable ?? true,
    },
    include: { category: { select: { id: true, name: true } } },
  });

  res.status(201).json({ product });
});

// PUT /api/products/:id
router.put('/:id', uploadProductImage.single('image'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = productSchema.parse(req.body);

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Product not found', 404);

  let imageUrl = existing.imageUrl;
  if (req.file) {
    if (existing.imageUrl) deleteFile(existing.imageUrl);
    imageUrl = `/uploads/products/${req.file.filename}`;
  }

  if (data.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!cat) throw new AppError('Invalid category', 400);
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      imageUrl,
      categoryId: data.categoryId || null,
      price: parseFloat(data.price),
      sellingUnit: data.sellingUnit,
      maxQuantity: data.maxQuantity,
      isAvailable: data.isAvailable ?? true,
    },
    include: { category: { select: { id: true, name: true } } },
  });

  res.json({ product });
});

// PATCH /api/products/:id/availability
router.patch('/:id/availability', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isAvailable } = z.object({ isAvailable: z.boolean() }).parse(req.body);

  const product = await prisma.product.update({
    where: { id },
    data: { isAvailable },
  });
  res.json({ product });
});

// DELETE /api/products/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Product not found', 404);

  const inDrop = await prisma.dropProduct.count({ where: { productId: id } });
  if (inDrop > 0) {
    throw new AppError('Cannot delete a product that is used in a drop', 400);
  }

  if (existing.imageUrl) deleteFile(existing.imageUrl);

  await prisma.product.delete({ where: { id } });
  res.json({ message: 'Product deleted' });
});

export default router;
