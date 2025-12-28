# Social Orchestrator API Contract

This document describes the HTTP API expected by the Social Orchestrator web frontend.

The TypeScript types for these payloads are defined in:

- `src/app/core/models/workflow.ts`
- `src/app/core/models/connection.ts`
- `src/app/core/api/api-types.ts`

The base URL is configured per environment as:

- `environment.apiBaseUrl` (see `src/environments/`).

Unless otherwise stated, all responses are JSON.

---

## Common notes

- Dates are ISO-8601 strings (e.g. `2025-01-01T10:00:00.000Z`).
- All endpoints are expected to be authenticated/authorized by the backend as needed (not handled by the frontend yet).
- The frontend currently uses optimistic updates:
  - It updates local state immediately.
  - It sends HTTP requests in the background.
  - Errors are surfaced via small toast notifications.

---

## 1. Workflows

### Type: `Workflow`

Defined in `src/app/core/models/workflow.ts`:

```ts
export type WorkflowStatus = 'draft' | 'active' | 'paused';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  createdAt: string;
  lastRunAt?: string;
}
```

### 1.1 GET /workflows

Returns the list of workflows.

- **Request**

  - Method: `GET`
  - URL: `${apiBaseUrl}/workflows`

- **Response**

  - `200 OK`
  - Body: `Workflow[]`

  ```json
  [
    {
      "id": "welcome-sequence",
      "name": "New follower welcome sequence",
      "description": "Sends a friendly welcome DM and highlights our top resources.",
      "status": "active",
      "createdAt": "2025-01-01T10:00:00.000Z",
      "lastRunAt": "2025-01-04T15:30:00.000Z"
    }
  ]
  ```

### 1.2 POST /workflows

Creates a new workflow.

The current frontend sends the full `Workflow` shape as the request body (including `id` and `createdAt`), and also updates local state optimistically. The backend may:

- Accept the object as-is, or
- Derive its own `id` and timestamps, and return the canonical `Workflow`.

- **Request**

  - Method: `POST`
  - URL: `${apiBaseUrl}/workflows`
  - Body: `WorkflowCreateRequest` (see `api-types.ts`), currently identical to `Workflow`.

  Example:

  ```json
  {
    "id": "weekly-digest",
    "name": "Weekly content digest",
    "description": "Publishes a curated digest across LinkedIn and Twitter every Friday.",
    "status": "paused",
    "createdAt": "2025-01-02T09:15:00.000Z",
    "lastRunAt": "2025-01-03T17:45:00.000Z"
  }
  ```

- **Response**

  - `201 Created` (recommended) or `200 OK`
  - Body: `Workflow` (canonical persisted representation)

### 1.3 PUT /workflows/:id

Updates an existing workflow.

- **Request**

  - Method: `PUT`
  - URL: `${apiBaseUrl}/workflows/:id`
  - Body: `WorkflowUpdateRequest` (currently the full `Workflow` shape).

  Example:

  ```json
  {
    "id": "weekly-digest",
    "name": "Weekly content digest (updated)",
    "description": "Updated description.",
    "status": "active",
    "createdAt": "2025-01-02T09:15:00.000Z",
    "lastRunAt": "2025-01-10T14:00:00.000Z"
  }
  ```

- **Response**

  - `200 OK`
  - Body: `Workflow`

### 1.4 DELETE /workflows/:id

Deletes a workflow.

- **Request**

  - Method: `DELETE`
  - URL: `${apiBaseUrl}/workflows/:id`

- **Response**

  - `204 No Content` (recommended)
  - Or `200 OK` with optional body:

  ```json
  { "deleted": true }
  ```

---

## 2. Connections

### Type: `Connection`

Defined in `src/app/core/models/connection.ts`:

```ts
export type ConnectionPlatform = 'twitter' | 'linkedin' | 'instagram' | 'facebook' | 'other';

export type ConnectionStatus = 'connected' | 'disconnected' | 'error';

export interface Connection {
  id: string;
  platform: ConnectionPlatform;
  label: string;
  handle: string;
  status: ConnectionStatus;
  createdAt: string;
  lastSyncAt?: string;
}
```

### 2.1 GET /connections

Returns the list of connections.

- **Request**

  - Method: `GET`
  - URL: `${apiBaseUrl}/connections`

- **Response**

  - `200 OK`
  - Body: `Connection[]`

  ```json
  [
    {
      "id": "twitter-main",
      "platform": "twitter",
      "label": "Twitter / X",
      "handle": "@acme",
      "status": "connected",
      "createdAt": "2025-01-01T10:00:00.000Z",
      "lastSyncAt": "2025-01-04T15:30:00.000Z"
    }
  ]
  ```

### 2.2 POST /connections

Creates a new connection.

As with workflows, the frontend currently sends the full `Connection` object (frontend-generated `id`, timestamps, and `status: 'connected'`).

- **Request**

  - Method: `POST`
  - URL: `${apiBaseUrl}/connections`
  - Body: `ConnectionCreateRequest` (same shape as `Connection` in the current implementation).

  ```json
  {
    "id": "linkedin-company",
    "platform": "linkedin",
    "label": "LinkedIn Company Page",
    "handle": "Acme Inc.",
    "status": "connected",
    "createdAt": "2025-01-02T09:15:00.000Z",
    "lastSyncAt": "2025-01-04T11:00:00.000Z"
  }
  ```

- **Response**

  - `201 Created` (recommended) or `200 OK`
  - Body: `Connection`

### 2.3 PATCH /connections/:id

Updates connection status (and optionally other fields).

The frontend currently uses PATCH for status changes:

- To disconnect: `{ "status": "disconnected" }`
- For generic status changes via `setStatus`: `{ "status": "<connected|disconnected|error>" }`

- **Request**

  - Method: `PATCH`
  - URL: `${apiBaseUrl}/connections/:id`
  - Body: partial `ConnectionUpdateRequest` (at minimum, `status`).

  Example (disconnect):

  ```json
  { "status": "disconnected" }
  ```

- **Response**

  - `200 OK`
  - Body: `Connection`

---

## 3. Health

The frontend uses a health endpoint to show an API status badge when not in mock mode.

### Type: `HealthResponse`

Defined in `src/app/core/api/api-types.ts`:

```ts
export interface HealthResponse {
  ok: boolean;
  version?: string;
}
```

### 3.1 GET /health

- **Request**

  - Method: `GET`
  - URL: `${apiBaseUrl}/health`

- **Response**

  - `200 OK`
  - Body:

  ```json
  { "ok": true, "version": "1.0.0" }
  ```

  - If `ok` is `false`, the frontend will treat the API as offline for display purposes.

- **Frontend behavior**

  - In mock mode (`environment.useMockApi === true`):
    - The app does not call `/health`, and shows a badge: `API: Mock mode`.
  - In live mode (`useMockApi === false`):
    - Calls `GET /health` once on startup.
    - Badge meanings:
      - `Live · Online` → `/health` responded with `ok: true`.
      - `Live · Offline` → `/health` failed or responded with `ok: false`.
      - `Live · Checking…` → transient state while awaiting the first response.

---

## 4. Notes for backend implementers

1. You can generate server types from the shared TypeScript models (or copy them) to align field names and enums exactly.
2. If you prefer a more canonical REST contract where the backend owns IDs/timestamps:
   - You can adapt the frontend later to send `Create`/`Update` DTOs without `id`/timestamps and handle them asynchronously.
   - For now, the contract above matches the current frontend implementation and allows a straightforward backend implementation.
3. Authentication/authorization and rate limiting are left to the backend; the frontend will simply use the configured `apiBaseUrl` and HTTP headers you add later.