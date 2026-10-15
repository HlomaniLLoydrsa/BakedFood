import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Ensure upload directories exist
const productDir = path.join(UPLOAD_DIR, 'products');
const proofDir = path.join(UPLOAD_DIR, 'proofs');

[productDir, proofDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

function createStorage(subDir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(UPLOAD_DIR, subDir));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${uuidv4()}${ext}`;
      cb(null, filename);
    },
  });
}

function imageFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
  }
}

function proofFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (ALLOWED_PROOF_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and PDF files are allowed for proof of payment'));
  }
}

export const uploadProductImage = multer({
  storage: createStorage('products'),
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export const uploadProofOfPayment = multer({
  storage: createStorage('proofs'),
  fileFilter: proofFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export function getFileUrl(subDir: string, filename: string): string {
  return `/uploads/${subDir}/${filename}`;
}

export function deleteFile(filePath: string): void {
  try {
    const fullPath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error('Error deleting file:', err);
  }
}
