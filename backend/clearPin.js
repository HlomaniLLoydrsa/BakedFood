// One-off utility: clear the admin PIN so the app shows the "create PIN" screen.
// Works against whatever database the current Prisma config points to:
//   - Local:  DATABASE_URL="file:./dev.db"
//   - Turso:  TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (via the libSQL adapter)
//
// Run:  node clearPin.js
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

async function main() {
  // Reuse the app's connection logic so Turso works too.
  let prisma;
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const dbUrl = process.env.DATABASE_URL;
  const isTurso =
    (tursoUrl && tursoUrl.startsWith('libsql://')) ||
    (dbUrl && dbUrl.startsWith('libsql://'));

  if (isTurso) {
    const { PrismaLibSQL } = require('@prisma/adapter-libsql');
    const { createClient } = require('@libsql/client');
    const libsql = createClient({
      url: tursoUrl || dbUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    prisma = new PrismaClient({ adapter: new PrismaLibSQL(libsql) });
    console.log('Target: Turso (libSQL)');
  } else {
    prisma = new PrismaClient();
    console.log('Target: local SQLite ->', dbUrl);
  }

  const before = await prisma.setting.findUnique({ where: { key: 'adminPin' } });
  console.log('Before:', before ? 'PIN is set' : 'no PIN set');

  const result = await prisma.setting.deleteMany({ where: { key: 'adminPin' } });
  console.log('Deleted rows:', result.count);

  const after = await prisma.setting.findUnique({ where: { key: 'adminPin' } });
  console.log('After:', after ? 'STILL SET (problem!)' : 'cleared — next /admin visit will ask to create a new PIN');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
