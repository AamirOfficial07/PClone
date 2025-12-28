const express = require('express');
const { pool, initSchema } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Very simple CORS for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  );
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Helpers

function slugify(value, fallback) {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return base || fallback;
}

// Map DB rows to API shapes

function mapWorkflowRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    lastRunAt: row.last_run_at ? row.last_run_at.toISOString() : undefined
  };
}

function mapConnectionRow(row) {
  return {
    id: row.id,
    platform: row.platform,
    label: row.label,
    handle: row.handle,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    lastSyncAt: row.last_sync_at ? row.last_sync_at.toISOString() : undefined
  };
}

// Health

app.get('/health', async (req, res) => {
  try {
    await pool.query('select 1');
    res.json({ ok: true, version: '1.0.0' });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// Workflows

app.get('/workflows', async (req, res) => {
  try {
    const result = await pool.query('select * from workflows order by created_at asc');
    res.json(result.rows.map(mapWorkflowRow));
  } catch (err) {
    console.error('Error fetching workflows', err);
    res.sendStatus(500);
  }
});

app.post('/workflows', async (req, res) => {
  const body = req.body || {};

  const now = new Date().toISOString();
  const name = (body.name || '').toString().trim();

  const baseId = slugify(name, 'workflow');
  let candidateId = body.id || baseId;
  let suffix = 1;

  try {
    // ensure id uniqueness
    while (true) {
      const existing = await pool.query('select id from workflows where id = $1', [
        candidateId
      ]);
      if (existing.rowCount === 0) {
        break;
      }
      candidateId = `${baseId}-${suffix++}`;
    }

    const result = await pool.query(
      `
      insert into workflows (id, name, description, status, created_at, last_run_at)
      values ($1, $2, $3, $4, $5, $6)
      returning *
    `,
      [
        candidateId,
        name,
        (body.description || '').toString(),
        body.status || 'draft',
        body.createdAt || now,
        body.lastRunAt || null
      ]
    );

    res.status(201).json(mapWorkflowRow(result.rows[0]));
  } catch (err) {
    console.error('Error creating workflow', err);
    res.sendStatus(500);
  }
});

app.put('/workflows/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body || {};

  try {
    const existing = await pool.query('select * from workflows where id = $1', [id]);
    if (existing.rowCount === 0) {
      return res.sendStatus(404);
    }

    const current = existing.rows[0];

    const result = await pool.query(
      `
      update workflows
      set name = $1,
          description = $2,
          status = $3,
          created_at = $4,
          last_run_at = $5
      where id = $6
      returning *
    `,
      [
        typeof body.name === 'string' ? body.name : current.name,
        typeof body.description === 'string' ? body.description : current.description,
        typeof body.status === 'string' ? body.status : current.status,
        body.createdAt || current.created_at,
        body.lastRunAt !== undefined ? body.lastRunAt : current.last_run_at,
        id
      ]
    );

    res.json(mapWorkflowRow(result.rows[0]));
  } catch (err) {
    console.error('Error updating workflow', err);
    res.sendStatus(500);
  }
});

app.delete('/workflows/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query('delete from workflows where id = $1', [id]);
    if (result.rowCount === 0) {
      return res.sendStatus(404);
    }
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting workflow', err);
    res.sendStatus(500);
  }
});

// Connections

app.get('/connections', async (req, res) => {
  try {
    const result = await pool.query('select * from connections order by created_at asc');
    res.json(result.rows.map(mapConnectionRow));
  } catch (err) {
    console.error('Error fetching connections', err);
    res.sendStatus(500);
  }
});

app.post('/connections', async (req, res) => {
  const body = req.body || {};

  const now = new Date().toISOString();
  const label = (body.label || '').toString().trim();
  const handle = (body.handle || '').toString().trim();

  const baseId = slugify(label || handle, 'connection');
  let candidateId = body.id || baseId;
  let suffix = 1;

  try {
    while (true) {
      const existing = await pool.query('select id from connections where id = $1', [
        candidateId
      ]);
      if (existing.rowCount === 0) {
        break;
      }
      candidateId = `${baseId}-${suffix++}`;
    }

    const result = await pool.query(
      `
      insert into connections (id, platform, label, handle, status, created_at, last_sync_at)
      values ($1, $2, $3, $4, $5, $6, $7)
      returning *
    `,
      [
        candidateId,
        body.platform || 'other',
        label,
        handle,
        body.status || 'connected',
        body.createdAt || now,
        body.lastSyncAt || now
      ]
    );

    res.status(201).json(mapConnectionRow(result.rows[0]));
  } catch (err) {
    console.error('Error creating connection', err);
    res.sendStatus(500);
  }
});

app.patch('/connections/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body || {};

  try {
    const existing = await pool.query('select * from connections where id = $1', [id]);
    if (existing.rowCount === 0) {
      return res.sendStatus(404);
    }

    const current = existing.rows[0];

    const result = await pool.query(
      `
      update connections
      set status = $1,
          label = $2,
          handle = $3,
          last_sync_at = $4
      where id = $5
      returning *
    `,
      [
        typeof body.status === 'string' ? body.status : current.status,
        typeof body.label === 'string' ? body.label : current.label,
        typeof body.handle === 'string' ? body.handle : current.handle,
        new Date().toISOString(),
        id
      ]
    );

    res.json(mapConnectionRow(result.rows[0]));
  } catch (err) {
    console.error('Error updating connection', err);
    res.sendStatus(500);
  }
});

// Start server

initSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(
        `Social Orchestrator API listening on http://localhost:${port}`
      );
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database schema', err);
    process.exit(1);
  });