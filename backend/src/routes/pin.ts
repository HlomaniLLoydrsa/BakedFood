import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const PIN_KEY = 'adminPin';

// GET /api/pin/check — verify a PIN (used by frontend before entering admin)
router.post('/verify', async (req: Request, res: Response) => {
  const { pin } = z.object({ pin: z.string().min(4) }).parse(req.body);

  const stored = await prisma.setting.findUnique({ where: { key: PIN_KEY } });

  // If no PIN set yet, any 4+ digit input grants access (first-time setup)
  if (!stored?.value) {
    res.json({ valid: true, firstTime: true });
    return;
  }

  if (stored.value !== pin) {
    throw new AppError('Incorrect PIN', 401);
  }

  res.json({ valid: true });
});

// POST /api/pin/set — set or change the PIN (requires current PIN if one exists)
router.post('/set', async (req: Request, res: Response) => {
  const { currentPin, newPin } = z.object({
    currentPin: z.string().optional(),
    newPin: z.string().min(4, 'PIN must be at least 4 digits').max(8),
  }).parse(req.body);

  const stored = await prisma.setting.findUnique({ where: { key: PIN_KEY } });

  // If PIN already exists, require current PIN to change it
  if (stored?.value) {
    if (!currentPin || currentPin !== stored.value) {
      throw new AppError('Current PIN is incorrect', 401);
    }
  }

  await prisma.setting.upsert({
    where: { key: PIN_KEY },
    update: { value: newPin },
    create: { key: PIN_KEY, value: newPin },
  });

  res.json({ message: 'PIN updated' });
});

// GET /api/pin/exists — check if a PIN has been set (used to show setup screen)
router.get('/exists', async (_req: Request, res: Response) => {
  const stored = await prisma.setting.findUnique({ where: { key: PIN_KEY } });
  res.json({ exists: !!stored?.value });
});

export default router;
