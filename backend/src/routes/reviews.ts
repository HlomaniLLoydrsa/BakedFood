import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/reviews/eligible/:orderNumber — public: check if order is eligible for review
router.get('/eligible/:orderNumber', async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { orderNumber: req.params.orderNumber },
    select: {
      orderNumber: true,
      orderStatus: true,
      customerName: true,
      review: { select: { id: true } },
    },
  });

  if (!order) throw new AppError('Order not found', 404);

  res.json({
    eligible: order.orderStatus === 'COMPLETED',
    orderStatus: order.orderStatus,
    customerName: order.customerName,
    alreadyReviewed: !!order.review,
  });
});

// GET /api/reviews — public: fetch all public reviews
router.get('/', async (_req: Request, res: Response) => {
  const reviews = await prisma.review.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ reviews });
});

// POST /api/reviews — public: submit a review after order completed
router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({
    orderNumber: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    message: z.string().min(5, 'Please write at least a few words').max(1000),
  });

  const { orderNumber, rating, message } = schema.parse(req.body);

  // Find the order
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) throw new AppError('Order not found', 404);

  // Only allow reviews for COMPLETED orders
  if (order.orderStatus !== 'COMPLETED') {
    throw new AppError('Reviews can only be submitted for completed orders', 400);
  }

  // One review per order
  const existing = await prisma.review.findUnique({ where: { orderId: order.id } });
  if (existing) throw new AppError('A review has already been submitted for this order', 400);

  const review = await prisma.review.create({
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      rating,
      message,
      isPublic: true,
    },
  });

  res.status(201).json({ review });
});

export default router;
