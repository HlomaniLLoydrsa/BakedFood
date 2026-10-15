import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { uploadProductImage } from '../lib/storage';
import { deleteFile } from '../lib/storage';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const ADMIN_CODE = process.env.ADMIN_CODE || 'droply2024';

async function getSettingsMap(): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  settings.forEach((s) => { if (s.value !== null) map[s.key] = s.value; });
  return map;
}

// GET /api/settings — public (needed for checkout bank details)
router.get('/', async (_req: Request, res: Response) => {
  const settings = await getSettingsMap();
  res.json({ settings });
});

// PUT /api/settings — requires secret code in header or body
router.put('/', uploadProductImage.single('logo'), async (req: Request, res: Response) => {
  // Accept code from header OR form body (for multipart forms)
  const code = (req.headers['x-admin-code'] as string) || req.body.adminCode;
  if (!code || code !== ADMIN_CODE) {
    throw new AppError('Invalid access code', 403);
  }

  const bodySchema = z.object({
    businessName: z.string().max(200).optional(),
    businessPhone: z.string().max(20).optional(),
    businessWhatsapp: z.string().max(20).optional(),
    businessEmail: z.string().email().optional().or(z.literal('')),
    businessAddress: z.string().max(500).optional(),
    bankName: z.string().max(100).optional(),
    bankAccountHolder: z.string().max(200).optional(),
    bankAccountNumber: z.string().max(50).optional(),
    bankBranchCode: z.string().max(20).optional(),
    bankAccountType: z.string().max(50).optional(),
    eftInstructions: z.string().max(1000).optional(),
    deliveryEnabled: z.string().optional(),
    collectionEnabled: z.string().optional(),
    deliveryInstructions: z.string().max(1000).optional(),
    collectionInstructions: z.string().max(1000).optional(),
    adminCode: z.string().optional(), // strip from data
  });

  const data = bodySchema.parse(req.body);
  delete (data as Record<string, unknown>).adminCode; // don't store the code itself

  const updates: Record<string, string> = {};

  if (req.file) {
    const existing = await prisma.setting.findUnique({ where: { key: 'businessLogo' } });
    if (existing?.value) deleteFile(existing.value);
    updates['businessLogo'] = `/uploads/products/${req.file.filename}`;
  }

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) updates[key] = String(value);
  });

  await Promise.all(
    Object.entries(updates).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  const settings = await getSettingsMap();
  res.json({ settings });
});

export default router;
