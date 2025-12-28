# Social Orchestrator – Implementation Overview

This document summarizes what has been implemented so far across the **frontend**, **backend**, and **infrastructure** for Social Orchestrator.

---

## 1. Frontend Architecture (Angular)

### 1.1 Overall structure

- Angular standalone app using:
  - `AppComponent` as root shell.
  - `app.routes.ts` for routing:
    - `/` → Home
    - `/workflows` → Workflows list
    - `/workflows/new` → Create workflow
    - `/workflows/:id` → Workflow detail
    - `/workflows/:id/edit` → Edit workflow
    - `/settings` → Settings (Connections + Defaults)
- Global styles and shared primitives:
  - `src/styles.css` defines:
    - `.btn`, `.btn--primary`, `.btn--secondary`
    - `.tag` (status pill)
    - `.card` (panel/card)
- App shell:
  - `app.component.html`:
    - Header with logo (“SO”), title, main nav.
    - Right side: API status badge.
    - Sidebar (on wider screens) with navigation.
    - Main area with `<router-outlet>`.
  - `app.component.css`:
    - Layout grid, responsive sidebar.
    - Toast positioning and styling.
    - Header badge styling.

---

## 2. Workflows Feature

### 2.1 Data model

**File:** `src/app/core/models/workflow.ts`

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

### 2.2 WorkflowService

**File:** `src/app/workflows/workflow.service.ts`

Responsibilities:

- Holds workflow state in `BehaviorSubject&lt;Workflow[]&gt;`.
- Exposes reactive and imperative APIs:
  - `getAll(): Observable<Workflow[]>`
  - `getById(id: string): Workflow | undefined`
  - `create(input: { name; description; status })`
  - `update(id, changes)`
  - `delete(id)`

Implementation details:

- Uses `environment.apiBaseUrl` and `environment.useMockApi`.
- When `useMockApi: true`:
  - Only uses in-memory `BehaviorSubject`.
- When `useMockApi: false`:
  - On construction:
    - Calls `GET /workflows` and loads workflows from backend.
  - For create/update/delete:
    - Performs **optimistic updates** in memory.
    - Also calls backend:
      - `POST /workflows`
      - `PUT /workflows/:id`
      - `DELETE /workflows/:id`
  - If HTTP calls fail:
    - Uses `NotificationService.showError(...)` to show error toasts (state is not rolled back).

### 2.3 Workflows list UI

**File:** `src/app/workflows/workflows.component.ts`

Key behavior:

- Uses `workflowService.getAll()` and `async` pipe to render workflows.
- “+ New workflow” button:
  - `routerLink="/workflows/new"`.
- For each workflow:
  - Shows:
    - Name
    - Description
    - Status (styled `.tag` with status-specific modifiers)
    - Created date
    - Last run (if present)
  - Actions:
    - **Edit** → `/workflows/:id/edit` (with click propagation stopped).
    - **Delete**:
      - Confirmation dialog (`window.confirm`).
      - On confirm: calls `workflowService.delete(id)`.
      - On success: shows toast “Workflow deleted.”

### 2.4 Workflow detail UI

**File:** `src/app/workflows/workflow-detail.component.ts`

Key behavior:

- On construction:
  - Reads `:id` from route.
  - Uses `workflowService.getById` to load workflow.
  - If not found: shows “We couldn’t find that workflow.”
- Displays:
  - Name
  - Description
  - Status (tag with draft/active/paused styles).
  - Metadata: created date, last run or “not run yet”.
- Actions:
  - Back to `/workflows`.
  - Edit → `/workflows/:id/edit`.
  - Delete:
    - Confirmation.
    - Calls `workflowService.delete(id)`.
    - On success: toast “Workflow deleted.” and navigates to `/workflows`.

### 2.5 Workflow editor (create/edit)

**File:** `src/app/workflows/workflow-editor.component.ts`

Form:

- Reactive FormGroup with controls:
  - `name`: `required`, `maxLength(120)` + specific validation messages:
    - “Name is required.”
    - “Name can’t be longer than 120 characters.”
  - `description`
  - `status`: `'draft' | 'active' | 'paused'` (select)

Modes:

- **Create** (`/workflows/new`):
  - Empty form.
  - On submit:
    - Validates and trims values.
    - Calls `workflowService.create(...)`.
    - Shows “Workflow created.” toast.
    - Navigates to `/workflows/:id` for the new workflow.

- **Edit** (`/workflows/:id/edit`):
  - Loads workflow via `getById`.
  - Pre-fills form.
  - On submit:
    - Calls `workflowService.update(...)`.
    - Shows “Workflow updated.” toast.
    - Navigates back to `/workflows/:id`.

Cancel behavior:

- In edit mode: goes back to that workflow’s detail page.
- In create mode: goes back to `/workflows`.

---

## 3. Settings / Connections Feature

### 3.1 Data model

**File:** `src/app/core/models/connection.ts`

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

### 3.2 ConnectionsService

**File:** `src/app/settings/connections.service.ts`

Responsibilities:

- State in `BehaviorSubject&lt;Connection[]&gt;`.
- Methods:
  - `getAll(): Observable<Connection[]>`
  - `connect({ platform, handle, label })`
  - `disconnect(id)`
  - `setStatus(id, status)`

Implementation:

- Uses `environment.apiBaseUrl` and `environment.useMockApi`.
- When `useMockApi: true`: purely in-memory.
- When `useMockApi: false`:
  - On construction:
    - Loads from `GET /connections`.
  - `connect`:
    - Adds connection locally.
    - Calls `POST /connections`.
    - On error: toast “Could not save the connection to the server.”
  - `disconnect`:
    - Updates status to `disconnected` in memory.
    - Calls `PATCH /connections/:id` with `{ status: 'disconnected' }`.
    - On error: toast “Could not disconnect the connection on the server.”
  - `setStatus`:
    - Generic status update.
    - Calls `PATCH /connections/:id` with `{ status }`.
    - On error: toast “Could not update the connection on the server.”

### 3.3 Settings UI

**File:** `src/app/settings/settings.component.ts`

Tabs:

- Buttons for “Connections” and “Defaults”:
  - Maintained via `activeTab: 'connections' | 'defaults'`.

Connections tab:

- Connection creation form:
  - Fields:
    - `platform` select.
    - `handle` (required).
    - `label` (required).
  - Validation messages:
    - “Handle is required.”
    - “Label is required.”
  - On submit:
    - Validates, then calls `connectionsService.connect(...)`.
    - Shows “Connection added.” toast.
    - Resets form with `platform: 'twitter'`.

- Connections list:
  - Uses `connections$ | async`.
  - Shows empty state if none.
  - For each connection:
    - Avatar with platform short code (e.g. X, Li).
    - Label, platform description, handle.
    - Metadata: created date, last sync date.
    - Status tag with styling for `connected`, `disconnected`, `error`.
    - “Disconnect” button (disabled if not `connected`) with confirmation dialog.

Defaults tab:

- Descriptive card explaining intended future defaults (posting windows, time zones, safety limits).

---

## 4. UX Infrastructure (Toasts, Layout, Shared Styles)

### 4.1 NotificationService and Toasts

**Model:** `src/app/core/models/toast.ts`

```ts
export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}
```

**Service:** `src/app/core/services/notification.service.ts`

- Holds `BehaviorSubject<Toast | null>`.
- API:
  - `show(message, kind, durationMs)`
  - `showSuccess(message)`
  - `showError(message)`
  - `clear()`
- Auto-dismiss logic with timeout.

**UI Integration:** `AppComponent`:

- Subscribes to `toast$`.
- `app.component.html` has toast bar in top-right.

### 4.2 Layout Shell

**`AppComponent` template & styles:**

- Header:
  - Brand logo and title.
  - Navigation: Home / Workflows / Settings.
  - Right side: nav + API status badge.
- Sidebar:
  - Visible on wide screens, links to Workflows and Settings.
- Main content:
  - Centered content area, constrained width.

### 4.3 Shared UI Classes

In `src/styles.css`:

- `.btn` with `.btn--primary`, `.btn--secondary`.
- `.tag` for status badges.
- `.card` for card-like containers.

Used across Workflows and Settings components for consistency.

---

## 5. Environment & API Mode

### 5.1 Environment files

**Files:**

- `src/environments/environment.ts` (production-like):
  - `production: true`
  - `apiBaseUrl: 'https://api.social-orchestrator.example.com'`
  - `useMockApi: true`
- `src/environments/environment.development.ts`:
  - `production: false`
  - `apiBaseUrl: 'http://localhost:3000'`
  - `useMockApi: true | false` (toggle mock vs live API)

Services (`WorkflowService`, `ConnectionsService`) read these and adjust behavior accordingly.

---

## 6. API Contract Layer

### 6.1 TypeScript API types

**File:** `src/app/core/api/api-types.ts`

Defines request/response types for:

- Workflows:
  - `WorkflowListResponse`, `WorkflowCreateRequest`, `WorkflowCreateResponse`
  - `WorkflowUpdateRequest`, `WorkflowUpdateResponse`
- Connections:
  - `ConnectionListResponse`, `ConnectionCreateRequest`, `ConnectionCreateResponse`
  - `ConnectionUpdateRequest`, `ConnectionUpdateResponse`
- Health:
  - `HealthResponse { ok: boolean; version?: string }`

### 6.2 API_CONTRACT.md

**File:** `API_CONTRACT.md`

Documents expected endpoints:

- Workflows:
  - `GET /workflows`
  - `POST /workflows`
  - `PUT /workflows/:id`
  - `DELETE /workflows/:id`
- Connections:
  - `GET /connections`
  - `POST /connections`
  - `PATCH /connections/:id`
- Health:
  - `GET /health`

Includes shape details, example payloads, and response codes.

---

## 7. API Health Indicator

### 7.1 ApiStatusService

**File:** `src/app/core/services/api-status.service.ts`

- Maintains:

```ts
export type ApiMode = 'mock' | 'live';
export type ApiStatus = 'unknown' | 'online' | 'offline';

export interface ApiState {
  mode: ApiMode;
  status: ApiStatus;
}
```

- Behavior:
  - If `useMockApi: true`:
    - `mode: 'mock', status: 'online'`.
  - If `useMockApi: false`:
    - Calls `GET /health`.
    - Sets `status` to `online`, `offline`, or `unknown` based on response.

### 7.2 Header Badge

**File:** `src/app/app.component.html` / `.css`

- UI badge text:
  - `API: Mock mode`
  - `API: Live · Online`
  - `API: Live · Offline`
  - `API: Live · Checking…`

Styled to visually indicate API mode and status.

---

## 8. Backend API (Node/Express + Postgres)

### 8.1 Database layer

**File:** `api/db.js`

- Uses `pg` `Pool` with env vars:
  - `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`.
- `initSchema()` creates:
  - `workflows` table.
  - `connections` table.

### 8.2 Express server

**File:** `api/server.js`

- CORS + JSON middleware.
- Helpers to map DB rows to API models.

Endpoints:

- `GET /health`
  - Checks DB connectivity with `select 1`.
  - Returns `{ ok: true, version: '1.0.0' }` or `{ ok: false }`.
- Workflows:
  - `GET /workflows` → `SELECT * FROM workflows`.
  - `POST /workflows`:
    - Generates ID (slug + suffix).
    - Inserts row.
  - `PUT /workflows/:id`:
    - Updates row or returns `404`.
  - `DELETE /workflows/:id`:
    - Deletes row or returns `404`.
- Connections:
  - `GET /connections` → `SELECT * FROM connections`.
  - `POST /connections`:
    - Generates ID (slug + suffix).
    - Inserts row.
  - `PATCH /connections/:id`:
    - Updates status/label/handle, bumps `last_sync_at`.

Startup:

- Runs `initSchema()` then starts listening on `PORT` (default `3000`).

---

## 9. Seed Script

**File:** `api/seed.js`

- Ensures schema exists.
- Clears `workflows` and `connections`.
- Inserts initial workflows and connections matching the original in-memory data.

**NPM script:** `seed:api` in `package.json`.

Usage:

```bash
cd social-orchestrator-web
npm run seed:api
npm run start:api
```

With `environment.development.ts` set to `useMockApi: false`, the Angular app will use this seeded Postgres-backed API.

---

## 10. Current Status Summary

- **Frontend**
  - Full CRUD for Workflows.
  - Fully functional Connections management.
  - Shared UX (toasts, layout, styling).
  - Environment-aware API integration with mock/live modes and error feedback.

- **Backend**
  - Express API with Postgres persistence for workflows and connections.
  - Schema auto-creation and repeatable seed script.
  - Health endpoint integrated with frontend status.

- **Developer experience**
  - One repo for frontend + backend.
  - Simple workflows:
    - `npm run seed:api` – seed DB.
    - `npm run start:api` – run API.
    - `npm start` – run Angular app.
  - Toggle `useMockApi` to switch between mock and live API without touching components.