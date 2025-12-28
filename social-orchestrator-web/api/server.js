const express = require('express');

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

// In-memory data stores

let workflows = [
  {
    id: 'welcome-sequence',
    name: 'New follower welcome sequence',
    description: 'Sends a friendly welcome DM and highlights our top resources.',
    status: 'active',
    createdAt: '2025-01-01T10:00:00.000Z',
    lastRunAt: '2025-01-04T15:30:00.000Z'
  },
  {
    id: 'weekly-digest',
    name: 'Weekly content digest',
    description: 'Publishes a curated digest across LinkedIn and Twitter every Friday.',
    status: 'paused',
    createdAt: '2025-01-02T09:15:00.000Z',
    lastRunAt: '2025-01-03T17:45:00.000Z'
  },
  {
    id: 'launch-campaign',
    name: 'Product launch campaign',
    description: 'Coordinates a multi-week campaign for the next product launch.',
    status: 'draft',
    createdAt: '2025-01-05T12:00:00.000Z'
  }
];

let connections = [
  {
    id: 'twitter-main',
    platform: 'twitter',
    label: 'Twitter / X',
    handle: '@acme',
    status: 'connected',
    createdAt: '2025-01-01T10:00:00.000Z',
    lastSyncAt: '2025-01-04T15:30:00.000Z'
  },
  {
    id: 'linkedin-company',
    platform: 'linkedin',
    label: 'LinkedIn Company Page',
    handle: 'Acme Inc.',
    status: 'connected',
    createdAt: '2025-01-02T09:15:00.000Z',
    lastSyncAt: '2025-01-04T11:00:00.000Z'
  }
];

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

// Health

app.get('/health', (req, res) => {
  res.json({ ok: true, version: '1.0.0' });
});

// Workflows

app.get('/workflows', (req, res) => {
  res.json(workflows);
});

app.post('/workflows', (req, res) => {
  const body = req.body || {};

  const now = new Date().toISOString();
  const name = (body.name || '').toString().trim();

  const baseId = slugify(name, 'workflow');
  let candidateId = body.id || baseId;
  let suffix = 1;

  while (workflows.some((w) => w.id === candidateId)) {
    candidateId = `${baseId}-${suffix++}`;
  }

  const workflow = {
    id: candidateId,
    name,
    description: (body.description || '').toString(),
    status: body.status || 'draft',
    createdAt: body.createdAt || now,
    lastRunAt: body.lastRunAt
  };

  workflows.push(workflow);

  res.status(201).json(workflow);
});

app.put('/workflows/:id', (req, res) => {
  const id = req.params.id;
  const index = workflows.findIndex((w) => w.id === id);

  if (index === -1) {
    return res.sendStatus(404);
  }

  const existing = workflows[index];
  const body = req.body || {};

  const updated = {
    ...existing,
    name: typeof body.name === 'string' ? body.name : existing.name,
    description:
      typeof body.description === 'string'
        ? body.description
        : existing.description,
    status: typeof body.status === 'string' ? body.status : existing.status,
    createdAt: body.createdAt || existing.createdAt,
    lastRunAt: body.lastRunAt !== undefined ? body.lastRunAt : existing.lastRunAt
  };

  workflows[index] = updated;

  res.json(updated);
});

app.delete('/workflows/:id', (req, res) => {
  const id = req.params.id;
  const index = workflows.findIndex((w) => w.id === id);

  if (index === -1) {
    return res.sendStatus(404);
  }

  workflows.splice(index, 1);

  res.sendStatus(204);
});

// Connections

app.get('/connections', (req, res) => {
  res.json(connections);
});

app.post('/connections', (req, res) => {
  const body = req.body || {};

  const now = new Date().toISOString();
  const label = (body.label || '').toString().trim();
  const handle = (body.handle || '').toString().trim();

  const baseId = slugify(label || handle, 'connection');
  let candidateId = body.id || baseId;
  let suffix = 1;

  while (connections.some((c) => c.id === candidateId)) {
    candidateId = `${baseId}-${suffix++}`;
  }

  const connection = {
    id: candidateId,
    platform: body.platform || 'other',
    label,
    handle,
    status: body.status || 'connected',
    createdAt: body.createdAt || now,
    lastSyncAt: body.lastSyncAt || now
  };

  connections.push(connection);

  res.status(201).json(connection);
});

app.patch('/connections/:id', (req, res) => {
  const id = req.params.id;
  const index = connections.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.sendStatus(404);
  }

  const existing = connections[index];
  const body = req.body || {};

  const updated = {
    ...existing,
    status:
      typeof body.status === 'string' ? body.status : existing.status,
    label: typeof body.label === 'string' ? body.label : existing.label,
    handle: typeof body.handle === 'string' ? body.handle : existing.handle,
    lastSyncAt: new Date().toISOString()
  };

  connections[index] = updated;

  res.json(updated);
});

// Start server

app.listen(port, () => {
  console.log(`Social Orchestrator API listening on http://localhost:${port}`);
});