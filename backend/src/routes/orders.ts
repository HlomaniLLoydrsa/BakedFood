import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { uploadProofOfPayment, uploadToCloudinary } from '../lib/cloudinary';
import { AppError } from '../middleware/errorHandler';
import { generateOrderNumber } from '../lib/orderNumber';

const router = Router();

const orderSchema = z.object({
  dropId: z.string().min(1),
  customerName: z.string().min(1, 'Full name is required').max(200),
  phone: z.string().min(7, 'Valid phone number is required').max(20),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  fulfilmentMethod: z.enum(['DELIVERY', 'COLLECTION']),
  deliveryAddress: z.string().max(500).optional(),
  paymentMethod: z.enum(['EFT', 'CASH']),
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().positive() }))
    .min(1, 'Order must contain at least one item'),
});

// GET /api/orders
router.get('/', async (req: Request, res: Response) => {
  const { dropId, paymentStatus, orderStatus, search, page = '1', limit = '50' } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (dropId) where.dropId = dropId;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (orderStatus) where.orderStatus = orderStatus;
  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { customerName: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where, skip, take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: true,
        payment: true,
        drop: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ orders, total, page: pageNum, limit: limitNum });
});

// GET /api/orders/export/:dropId  — must be before /:id
router.get('/export/:dropId', async (req: Request, res: Response) => {
  const { dropId } = req.params;

  const orders = await prisma.order.findMany({
    where: { dropId },
    orderBy: { createdAt: 'asc' },
    include: { orderItems: true },
  });

  const headers = [
    'Order Number','Customer Name','Phone','Email','Products','Quantities',
    'Total','Fulfilment','Delivery Address','Payment Method','Payment Status','Order Status','Date',
  ];

  const rows = orders.map((o) => {
    const productNames = o.orderItems.map((i) => i.productNameSnapshot).join(' | ');
    const quantities = o.orderItems.map((i) => `${i.quantity}x ${i.sellingUnitSnapshot}`).join(' | ');
    return [
      o.orderNumber, o.customerName, o.phone, o.email || '', productNames, quantities,
      `R${Number(o.totalAmount).toFixed(2)}`, o.fulfilmentMethod, o.deliveryAddress || '',
      o.paymentMethod, o.paymentStatus, o.orderStatus, new Date(o.createdAt).toLocaleString('en-ZA'),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="orders-${dropId}.csv"`);
  res.send(csv);
});

// GET /api/orders/number/:orderNumber  — requires phone verification
// Phone can be passed as query param: ?phone=0821234567
router.get('/number/:orderNumber', async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const phoneInput = (req.query.phone as string || '').trim().replace(/\s+/g, '');

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      orderItems: true,
      payment: true,
      drop: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!order) throw new AppError('Order not found. Please check your order number.', 404);

  // Verify phone number — strip spaces and non-digits for comparison
  if (phoneInput) {
    const normalize = (p: string) => p.replace(/\D/g, '').replace(/^0/, '27');
    const storedNorm = normalize(order.phone);
    const inputNorm  = normalize(phoneInput);

    // Accept if last 9 digits match (handles different +27 / 0 prefixes)
    const last9Stored = storedNorm.slice(-9);
    const last9Input  = inputNorm.slice(-9);

    if (last9Input.length >= 9 && last9Stored !== last9Input) {
      throw new AppError('The phone number does not match this order.', 403);
    }
  } else {
    // Phone is required — reject if not provided
    throw new AppError('Please provide your phone number to view this order.', 400);
  }

  res.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      fulfilmentMethod: order.fulfilmentMethod,
      deliveryAddress: order.deliveryAddress,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      cancelReason: (order as typeof order & { cancelReason?: string }).cancelReason,
      createdAt: order.createdAt,
      orderItems: order.orderItems,
      drop: order.drop,
    },
  });
});

// GET /api/orders/:id
router.get('/:id', async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      orderItems: true,
      payment: true,
      drop: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!order) throw new AppError('Order not found', 404);
  res.json({ order });
});

// POST /api/orders
router.post('/', async (req: Request, res: Response) => {
  const data = orderSchema.parse(req.body);

  if (data.fulfilmentMethod === 'DELIVERY' && !data.deliveryAddress?.trim()) {
    throw new AppError('Delivery address is required', 400);
  }

  const drop = await prisma.drop.findUnique({
    where: { id: data.dropId },
    include: { dropProducts: { include: { product: true } } },
  });
  if (!drop) throw new AppError('Drop not found', 404);

  const now = new Date();
  if (drop.status === 'CANCELLED' || drop.status === 'CLOSED' || now >= drop.closesAt) {
    throw new AppError('Orders for this drop are currently closed', 400);
  }
  if (now < drop.opensAt) throw new AppError('Orders for this drop have not opened yet', 400);
  if (data.paymentMethod === 'EFT' && !drop.allowEft) throw new AppError('EFT payment is not available for this drop', 400);
  if (data.paymentMethod === 'CASH' && !drop.allowCash) throw new AppError('Cash on Delivery is not available for this drop', 400);
  if (data.fulfilmentMethod === 'DELIVERY' && !drop.allowDelivery) throw new AppError('Delivery is not available for this drop', 400);
  if (data.fulfilmentMethod === 'COLLECTION' && !drop.allowCollection) throw new AppError('Collection is not available for this drop', 400);

  let totalAmount = 0;
  const orderItemsData: {
    productId: string; productNameSnapshot: string; sellingUnitSnapshot: string;
    quantity: number; unitPrice: number; subtotal: number;
  }[] = [];

  for (const item of data.items) {
    const dropProduct = drop.dropProducts.find((dp) => dp.productId === item.productId);
    if (!dropProduct) throw new AppError(`Product is not available in this drop`, 400);
    if (!dropProduct.product.isAvailable) throw new AppError(`${dropProduct.product.name} is currently unavailable`, 400);

    const maxQty = dropProduct.maxQuantity ?? dropProduct.product.maxQuantity;
    if (maxQty != null) {
      const agg = await prisma.orderItem.aggregate({
        where: { productId: item.productId, order: { dropId: drop.id, orderStatus: { not: 'CANCELLED' } } },
        _sum: { quantity: true },
      });
      const orderedSoFar = agg._sum.quantity || 0;
      if (orderedSoFar + item.quantity > maxQty) {
        const remaining = Math.max(0, maxQty - orderedSoFar);
        if (remaining === 0) throw new AppError(`${dropProduct.product.name} is sold out`, 400);
        throw new AppError(`Only ${remaining} unit(s) of ${dropProduct.product.name} remaining`, 400);
      }
    }

    const unitPrice = Number(dropProduct.price);
    const subtotal = unitPrice * item.quantity;
    totalAmount += subtotal;
    orderItemsData.push({
      productId: item.productId,
      productNameSnapshot: dropProduct.product.name,
      sellingUnitSnapshot: dropProduct.product.sellingUnit,
      quantity: item.quantity, unitPrice, subtotal,
    });
  }

  const orderNumber = await generateOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber, dropId: data.dropId,
      customerName: data.customerName, phone: data.phone,
      email: data.email || null,
      fulfilmentMethod: data.fulfilmentMethod,
      deliveryAddress: data.deliveryAddress || null,
      totalAmount,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentMethod === 'CASH' ? 'CASH_PENDING' : 'AWAITING_PAYMENT',
      orderItems: { create: orderItemsData },
      payment: {
        create: {
          paymentMethod: data.paymentMethod,
          reference: orderNumber,
          amount: totalAmount,
          status: data.paymentMethod === 'CASH' ? 'CASH_PENDING' : 'AWAITING_PAYMENT',
        },
      },
    },
    include: {
      orderItems: true, payment: true,
      drop: { select: { id: true, name: true, slug: true } },
    },
  });

  res.status(201).json({ order });
});

// POST /api/orders/:id/upload-pop
router.post('/:id/upload-pop', uploadProofOfPayment.single('proof'), async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!req.file) throw new AppError('Please upload a proof of payment file', 400);

  const order = await prisma.order.findUnique({ where: { id }, include: { payment: true } });
  if (!order) throw new AppError('Order not found', 404);
  if (order.paymentMethod !== 'EFT') throw new AppError('This order does not require proof of payment', 400);
  if (order.paymentStatus === 'PAYMENT_VERIFIED') throw new AppError('Payment has already been verified', 400);

  const proofUrl = await uploadToCloudinary(
    req.file.buffer,
    'droply/proofs',
    req.file.mimetype === 'application/pdf' ? 'raw' : 'image'
  );

  await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { paymentStatus: 'POP_SUBMITTED' } }),
    prisma.payment.update({ where: { orderId: id }, data: { proofUrl, status: 'POP_SUBMITTED' } }),
  ]);

  res.json({ message: 'Proof of payment uploaded', proofUrl });
});

// PATCH /api/orders/:id/payment-status
router.patch('/:id/payment-status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, rejectionReason } = z.object({
    status: z.enum(['PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'CASH_RECEIVED']),
    rejectionReason: z.string().max(500).optional(),
  }).parse(req.body);

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new AppError('Order not found', 404);

  await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { paymentStatus: status } }),
    prisma.payment.update({
      where: { orderId: id },
      data: { status, rejectionReason: rejectionReason || null, verifiedAt: new Date() },
    }),
  ]);

  const updatedOrder = await prisma.order.findUnique({
    where: { id },
    include: { orderItems: true, payment: true, drop: { select: { id: true, name: true } } },
  });

  res.json({ order: updatedOrder });
});

// PATCH /api/orders/:id/order-status — admin only, enforced one-way flow
router.patch('/:id/order-status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = z.object({
    status: z.enum(['CONFIRMED', 'COMPLETED']),
  }).parse(req.body);

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new AppError('Order not found', 404);

  // Enforce one-way flow: PENDING → CONFIRMED → COMPLETED
  const flow: Record<string, string> = { PENDING: 'CONFIRMED', CONFIRMED: 'COMPLETED' };

  if (order.orderStatus === 'CANCELLED') {
    throw new AppError('Cannot change status of a cancelled order', 400);
  }
  if (order.orderStatus === 'COMPLETED') {
    throw new AppError('Order is already completed and cannot be changed', 400);
  }
  if (flow[order.orderStatus] !== status) {
    throw new AppError(`Cannot move from ${order.orderStatus} to ${status}. Expected: ${flow[order.orderStatus]}`, 400);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { orderStatus: status },
    include: { orderItems: true, payment: true, drop: { select: { id: true, name: true } } },
  });

  res.json({ order: updated });
});

// POST /api/orders/:orderNumber/cancel — customer cancel (PENDING only, reason + phone required)
router.post('/number/:orderNumber/cancel', async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const { reason, phone } = z.object({
    reason: z.string().min(5, 'Please provide a reason (at least 5 characters)').max(500),
    phone: z.string().min(7, 'Phone number required to verify your identity'),
  }).parse(req.body);

  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) throw new AppError('Order not found', 404);

  // Verify phone number
  const normalize = (p: string) => p.replace(/\D/g, '').replace(/^0/, '27');
  const last9Stored = normalize(order.phone).slice(-9);
  const last9Input  = normalize(phone).slice(-9);
  if (last9Input.length >= 9 && last9Stored !== last9Input) {
    throw new AppError('The phone number does not match this order.', 403);
  }

  if (order.orderStatus === 'COMPLETED') {
    throw new AppError('Completed orders cannot be cancelled', 400);
  }
  if (order.orderStatus === 'CONFIRMED') {
    throw new AppError('Your order has already been confirmed and cannot be cancelled. Please contact us directly.', 400);
  }
  if (order.orderStatus === 'CANCELLED') {
    throw new AppError('This order is already cancelled', 400);
  }

  const updated = await prisma.order.update({
    where: { orderNumber },
    data: { orderStatus: 'CANCELLED', cancelReason: reason },
    include: { orderItems: true, payment: true, drop: { select: { id: true, name: true, slug: true } } },
  });

  res.json({ order: updated });
});

export default router;
