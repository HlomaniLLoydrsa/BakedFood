import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Request } from 'express';
import { Readable } from 'stream';

// Configure Cloudinary from env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// Use memory storage so we can stream to Cloudinary
const memoryStorage = multer.memoryStorage();

const ALLOWED_IMAGE_TYPES  = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_PROOF_TYPES  = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE        = 10 * 1024 * 1024; // 10MB

function imageFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  ALLOWED_IMAGE_TYPES.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Only JPG, PNG and WEBP images are allowed'));
}

function proofFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  ALLOWED_PROOF_TYPES.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Only JPG, PNG and PDF files are allowed for proof of payment'));
}

export const uploadProductImage = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export const uploadProofOfPayment = multer({
  storage: memoryStorage,
  fileFilter: proofFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Upload a buffer to Cloudinary and return the secure URL
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw' = 'image'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Upload failed'));
        resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}

// Delete a file from Cloudinary by URL
export async function deleteFromCloudinary(url: string): Promise<void> {
  try {
    // Extract public_id from URL: .../upload/v123/folder/filename.ext
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    if (match) {
      await cloudinary.uploader.destroy(match[1]);
    }
  } catch (err) {
    console.error('Cloudinary delete error:', err);
  }
}
