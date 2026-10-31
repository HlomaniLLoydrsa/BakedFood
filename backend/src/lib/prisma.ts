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
// The Turso connection details can be provided in several shapes, and we
// support all of them so the deploy "just works":
//   1. TURSO_DATABASE_URL + TURSO_AUTH_TOKEN  (recommended)
//   2. DATABASE_URL = "libsql://host"         + TURSO_AUTH_TOKEN
//   3. DATABASE_URL = "libsql://host?authToken=xxxxx"  (token embedded)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveTursoConfig(): { url: string; authToken?: string } | null {
  const raw = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  if (!raw || !raw.startsWith('libsql://')) return null;

  let url = raw;
  let authToken = process.env.TURSO_AUTH_TOKEN;

  // If the token is embedded in the URL as ?authToken=..., extract it and
  // strip it from the URL (the libSQL client expects a clean url + token).
  const qIndex = raw.indexOf('?');
  if (qIndex !== -1) {
    url = raw.slice(0, qIndex);
    const params = new URLSearchParams(raw.slice(qIndex + 1));
    const embedded = params.get('authToken');
    if (embedded && !authToken) authToken = embedded;
  }

  return { url, authToken };
}

function createPrismaClient(): PrismaClient {
  const turso = resolveTursoConfig();

  if (turso) {
    const libsql = createClient({
      url: turso.url,
      authToken: turso.authToken,
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
