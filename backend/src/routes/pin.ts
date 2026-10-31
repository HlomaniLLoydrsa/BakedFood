import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const PIN_KEY = 'adminPin';

// The PIN every new store starts with, until the admin changes it.
const DEFAULT_PIN = '0000';

/** Returns the currently-effective admin PIN (stored value, or the default). */
async function getEffectivePin(): Promise<string> {
  const stored = await prisma.setting.findUnique({ where: { key: PIN_KEY } });
  return stored?.value || DEFAULT_PIN;
}

// POST /api/pin/login — exchange a correct PIN for an admin JWT.
router.post('/login', async (req: Request, res: Response) => {
  const { pin } = z.object({ pin: z.string().min(4).max(8) }).parse(req.body);

  const effective = await getEffectivePin();
  if (pin !== effective) {
    throw new AppError('Incorrect PIN', 401);
  }

  // Issue an admin token. There is no per-user identity for the PIN gate,
  // so we use a fixed admin principal.
  const token = signToken({ userId: 'admin', email: 'admin@local', role: 'admin' });
  res.json({ token, usingDefault: pin === DEFAULT_PIN && !(await isPinCustomised()) });
});

/** True once the admin has set their own PIN (i.e. a value exists in settings). */
async function isPinCustomised(): Promise<boolean> {
  const stored = await prisma.setting.findUnique({ where: { key: PIN_KEY } });
  return !!stored?.value;
}

// GET /api/pin/status — public: lets the UI know if the default PIN is still in use.
router.get('/status', async (_req: Request, res: Response) => {
  res.json({ usingDefault: !(await isPinCustomised()), defaultPin: DEFAULT_PIN });
});

// POST /api/pin/set — change the PIN. Requires a valid admin token AND the
// current PIN (which is the default until the admin first changes it).
router.post('/set', authenticate, async (req: AuthRequest, res: Response) => {
  const { currentPin, newPin } = z
    .object({
      currentPin: z.string().min(4).max(8),
      newPin: z.string().min(4, 'PIN must be at least 4 digits').max(8),
    })
    .parse(req.body);

  const effective = await getEffectivePin();
  if (currentPin !== effective) {
    throw new AppError('Current PIN is incorrect', 401);
  }

  await prisma.setting.upsert({
    where: { key: PIN_KEY },
    update: { value: newPin },
    create: { key: PIN_KEY, value: newPin },
  });

  res.json({ message: 'PIN updated' });
});

export default router;
