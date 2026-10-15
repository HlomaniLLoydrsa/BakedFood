import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    res.status(400).json({ error: 'Validation failed', details: messages });
    return;
  }

  // Multer errors
  if (err.message && (err.message.includes('Only') || err.message.includes('allowed'))) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.message === 'File too large') {
    res.status(400).json({ error: 'File size exceeds the 10MB limit' });
    return;
  }

  // Generic server error - don't expose details
  res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
}
