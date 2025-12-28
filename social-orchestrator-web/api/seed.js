const { pool, initSchema } = require('./db');

async function seed() {
  await initSchema();

  // Clear existing data to keep seeding idempotent for local dev
  await pool.query('delete from workflows');
  await pool.query('delete from connections');

  // Seed workflows
  await pool.query(
    `
    insert into workflows (id, name, description, status, created_at, last_run_at)
    values
      ($1, $2, $3, $4, $5, $6),
      ($7, $8, $9, $10, $11, $12),
      ($13, $14, $15, $16, $17, $18)
  `,
    [
      'welcome-sequence',
      'New follower welcome sequence',
      'Sends a friendly welcome DM and highlights our top resources.',
      'active',
      '2025-01-01T10:00:00.000Z',
      '2025-01-04T15:30:00.000Z',

      'weekly-digest',
      'Weekly content digest',
      'Publishes a curated digest across LinkedIn and Twitter every Friday.',
      'paused',
      '2025-01-02T09:15:00.000Z',
      '2025-01-03T17:45:00.000Z',

      'launch-campaign',
      'Product launch campaign',
      'Coordinates a multi-week campaign for the next product launch.',
      'draft',
      '2025-01-05T12:00:00.000Z',
      null
    ]
  );

  // Seed connections
  await pool.query(
    `
    insert into connections (id, platform, label, handle, status, created_at, last_sync_at)
    values
      ($1, $2, $3, $4, $5, $6, $7),
      ($8, $9, $10, $11, $12, $13, $14)
  `,
    [
      'twitter-main',
      'twitter',
      'Twitter / X',
      '@acme',
      'connected',
      '2025-01-01T10:00:00.000Z',
      '2025-01-04T15:30:00.000Z',

      'linkedin-company',
      'linkedin',
      'LinkedIn Company Page',
      'Acme Inc.',
      'connected',
      '2025-01-02T09:15:00.000Z',
      '2025-01-04T11:00:00.000Z'
    ]
  );
}

seed()
  .then(() => {
    console.log('Seed completed.');
  })
  .catch((err) => {
    console.error('Seed failed', err);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });