import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

// Connection strategy:
// - Local dev:  DATABASE_URL="file:./dev.db"   → plain SQLite file, no adapter.
// - Production: Turso (libsql://...)            → libSQL driver adapter over HTTP.
//
// Prisma's built-in SQLite engine cannot speak libSQL's HTTP protocol, so for
// Turso we MUST go through the @prisma/adapter-libsql driver adapter.
//
// We detect Turso by the presence of TURSO_DATABASE_URL (or a libsql:// URL).

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const databaseUrl = process.env.DATABASE_URL;
  const isTurso =
    (tursoUrl && tursoUrl.startsWith('libsql://')) ||
    (databaseUrl ? databaseUrl.startsWith('libsql://') : false);

  if (isTurso) {
    const libsql = createClient({
      url: (tursoUrl || databaseUrl) as string,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter, log: ['error'] });
  }

  // Local SQLite file — no adapter needed.
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
