const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'social_orchestrator',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres'
});

async function initSchema() {
  await pool.query(`
    create table if not exists workflows (
      id text primary key,
      name text not null,
      description text not null default '',
      status text not null,
      created_at timestamptz not null default now(),
      last_run_at timestamptz null
    );
  `);

  await pool.query(`
    create table if not exists connections (
      id text primary key,
      platform text not null,
      label text not null,
      handle text not null,
      status text not null,
      created_at timestamptz not null default now(),
      last_sync_at timestamptz null
    );
  `);
}

module.exports = {
  pool,
  initSchema
};