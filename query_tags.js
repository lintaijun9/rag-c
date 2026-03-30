const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:cHczwTs7JeYfeMpH@124.223.68.223:35432/lifeflow',
});

async function run() {
  try {
    const res = await pool.query(`SELECT jsonb_typeof(tags) as type, count(*) FROM rag_metadata GROUP BY type`);
    console.log(res.rows);
    pool.end();
  } catch(e) { console.error(e) }
}
run();
