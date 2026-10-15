import { PrismaClient } from '@prisma/client';

// When TURSO_DATABASE_URL is set (production), Prisma connects to Turso.
// DATABASE_URL stays as the local SQLite fallback for development.
// No code changes needed — Prisma uses whichever DATABASE_URL is in the environment.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
