// Image/file storage — self-contained, no external service.
//
// Netlify has no persistent disk, so we can't write uploads to the filesystem.
// Instead of a third-party service (Cloudinary) we store uploads directly as
// data URIs on the existing string columns (product.imageUrl, payment.proofUrl,
// settings.businessLogo). Images are compressed to WebP with sharp first, so a
// multi-MB phone photo becomes ~30–80 KB — small enough to live in the DB and
// to embed straight into an <img src>. PDFs (proof of payment) are stored as-is.
//
// The exported names are kept identical to the old Cloudinary module so the
// route files don't need to change: uploadToCloudinary() now returns a data URI.

import multer from 'multer';
import { Request } from 'express';
import sharp from 'sharp';

// Keep files in memory so we can process them before storing.
const memoryStorage = multer.memoryStorage();

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB upload limit (before compression)

// Product images: keep to the formats sharp reliably compresses to WebP.
function imageFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  ALLOWED_IMAGE_TYPES.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Only JPG, PNG and WEBP images are allowed'));
}

// Proof of payment: accept ANY image type (incl. phone formats like HEIC) plus
// PDF. Customers upload from all kinds of devices, so be permissive here.
function proofFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ok = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
  ok ? cb(null, true) : cb(new Error('Please upload an image or a PDF'));
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

// Compress an image buffer to a WebP data URI. Resizes down to a sensible max
// width so stored images stay small regardless of the original photo size.
// If sharp can't handle the format (rare, e.g. an odd HEIC variant), fall back
// to storing the original bytes so the upload still succeeds.
async function imageToDataUri(buffer: Buffer, maxWidth: number, mimetype?: string): Promise<string> {
  try {
    const webp = await sharp(buffer)
      .rotate() // respect EXIF orientation from phone cameras
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return `data:image/webp;base64,${webp.toString('base64')}`;
  } catch {
    // Fallback: store the original image as-is. Cap size so a huge un-
    // compressible upload doesn't bloat the DB row.
    if (buffer.length > 4 * 1024 * 1024) {
      throw new Error('Image is too large — please upload a smaller photo');
    }
    const type = mimetype && mimetype.startsWith('image/') ? mimetype : 'image/jpeg';
    return `data:${type};base64,${buffer.toString('base64')}`;
  }
}

/**
 * Store an uploaded file and return a string to save in the DB.
 * - Images  -> compressed WebP data URI.
 * - PDFs    -> stored as a application/pdf data URI (proof of payment).
 *
 * Signature kept compatible with the old Cloudinary helper. The optional
 * `mimetype` lets us detect PDFs; when omitted we treat the buffer as an image.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  _folder: string,
  mimetype?: string
): Promise<string> {
  if (mimetype === 'application/pdf') {
    // Guard against storing very large PDFs in the DB row. ~4MB raw is plenty
    // for a proof-of-payment receipt and keeps the base64 row manageable.
    if (buffer.length > 4 * 1024 * 1024) {
      throw new Error('PDF is too large — please upload a file under 4MB or a photo instead');
    }
    return `data:application/pdf;base64,${buffer.toString('base64')}`;
  }
  // Product images / logos / proof images: compress to WebP. One size (900px)
  // is fine for all and keeps the code simple.
  return imageToDataUri(buffer, 900, mimetype);
}

/**
 * No-op: data URIs live in the database row itself, so there's nothing external
 * to delete. Kept for signature compatibility with the route files.
 */
export async function deleteFromCloudinary(_url: string): Promise<void> {
  // Intentionally empty — overwriting/clearing the DB column removes the image.
}
