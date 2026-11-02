const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const start = Date.now();
    const result = await prisma.$queryRawUnsafe(`
      SELECT 
        current_database() as db_name,
        version() as pg_version,
        pg_database_size(current_database()) as db_size_bytes,
        pg_size_pretty(pg_database_size(current_database())) as db_size_pretty,
        (SELECT count(*) FROM pg_stat_activity) as active_connections
    `);
    const duration = Date.now() - start;
    console.log('✅ NEON POSTGRESQL SUCCESS (' + duration + 'ms):');
    console.log(JSON.stringify(result, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('✅ TABLES IN DATABASE (' + tables.length + ' tables):');
    console.log(tables.map(t => t.table_name).join(', '));
  } catch (err) {
    console.error('❌ DATABASE ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
