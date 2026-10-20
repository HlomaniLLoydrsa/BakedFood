import { PrismaClient } from '@prisma/client';

// Prisma reads DATABASE_URL from environment automatically.
// - Local dev:    DATABASE_URL="file:./dev.db"           (SQLite file)
// - Production:   DATABASE_URL="libsql://..."            (Turso)
//
// No adapter needed — Prisma 5+ supports libsql:// natively via DATABASE_URL.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
