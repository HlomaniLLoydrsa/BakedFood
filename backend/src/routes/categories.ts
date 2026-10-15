import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
});

// GET /api/categories
router.get('/', async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json({ categories });
});

// POST /api/categories
router.post('/', async (req: Request, res: Response) => {
  const { name } = categorySchema.parse(req.body);

  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) throw new AppError('A category with this name already exists', 409);

  const category = await prisma.category.create({ data: { name } });
  res.status(201).json({ category });
});

// PUT /api/categories/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { name } = categorySchema.parse(req.body);
  const { id } = req.params;

  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing && existing.id !== id) throw new AppError('A category with this name already exists', 409);

  const category = await prisma.category.update({ where: { id }, data: { name } });
  res.json({ category });
});

// DELETE /api/categories/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const hasProducts = await prisma.product.count({ where: { categoryId: id } });
  if (hasProducts > 0) throw new AppError('Cannot delete a category that has products assigned to it', 400);

  await prisma.category.delete({ where: { id } });
  res.json({ message: 'Category deleted' });
});

export default router;
