# Phase 11 – Public API & Integrations (Zapier/Make/Webhooks)

**Audience:**  
- Solo developer exposing SocialOrchestrator as a platform.  
- Automated coding agents making the API safe and integrable.

**Goal of Phase 11:**  
Turn SocialOrchestrator into a proper platform by:

- Exposing a **versioned, documented public REST API**.  
- Securing it with API keys and scopes.  
- Implementing robust **webhooks** for outbound events.  
- Designing integrations for Zapier/Make and similar tools.

All core functionality (posts, accounts, analytics, automation) must have a public API surface where appropriate.

> IMPORTANT FOR CODING AGENTS:  
> - Keep a clear separation between internal (JWT) and public (API key) auth.  
> - Do not expose sensitive internal endpoints (e.g. admin, Hangfire) via the public API.

---

## 1. Domain – API Keys & Webhooks

In `SocialOrchestrator.Domain`:

Create folder: `Api/`.

### 1.1 ApiKey Entity

File: `Api/ApiKey.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `string Name` (label e.g., “Zapier Integrations”)
- `string KeyHash`  (hash of API key, not the key itself)
- `string[] Scopes` (stored as JSON or comma-separated string)
- `DateTime CreatedAt`
- `DateTime? LastUsedAt`
- `bool IsActive`

> API keys are never stored in plain text; only the hash is stored.

### 1.2 ApiScope Enum (or constants)

Define known scopes:

- `read:workspaces`, `write:workspaces`
- `read:accounts`, `write:accounts`
- `read:posts`, `write:posts`
- `read:analytics`
- `read:automation`, `write:automation`
- `read:media`, `write:media`
- etc.

You can represent scopes as simple strings; Domain doesn’t need a strong enum if you prefer.

### 1.3 WebhookSubscription Entity

File: `Api/WebhookSubscription.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `string Name`
- `string TargetUrl`
- `string[] EventTypes`  (e.g., `["post.published", "post.failed"]`)
- `string? Secret`  (used to sign webhook payloads)
- `bool IsActive`
- `DateTime CreatedAt`
- `DateTime? LastDeliveryAtUtc`

### 1.4 WebhookDelivery Entity

File: `Api/WebhookDelivery.cs`

Properties:

- `Guid Id`
- `Guid WebhookSubscriptionId`
- `DateTime AttemptedAtUtc`
- `int HttpStatusCode`
- `bool IsSuccess`
- `string RequestBody`
- `string? ResponseBody`
- `int RetryCount`

---

## 2. Infrastructure – EF Core for Public API

In `AppDbContext`:

Add DbSets:

- `DbSet<ApiKey> ApiKeys { get; set; }`
- `DbSet<WebhookSubscription> WebhookSubscriptions { get; set; }`
- `DbSet<WebhookDelivery> WebhookDeliveries { get; set; }`

Configure:

- `ApiKeys`:
  - Table: `ApiKeys`.
  - PK: `Id`.
  - Index: `(WorkspaceId, IsActive)`.

- `WebhookSubscriptions`:
  - Table: `WebhookSubscriptions`.
  - PK: `Id`.
  - Index: `(WorkspaceId, IsActive)`.

- `WebhookDeliveries`:
  - Table: `WebhookDeliveries`.
  - PK: `Id`.
  - Index: `(WebhookSubscriptionId, AttemptedAtUtc)`.

Create migration:

- Name: `Phase11_PublicApiAndIntegrations`.
- Run `dotnet ef database update`.

---

## 3. API Authentication – API Keys

### 3.1 API Key Format

- Public API keys may follow a format like:  
  `so_{publicPart}.{secretPart}`

Only the secret part (hashed) is stored in DB.

### 3.2 Middleware / Handler

In `SocialOrchestrator.Api`:

- Add a dedicated **API key authentication handler**:
  - Scheme name: `"ApiKey"`.
  - Looks for header:
    - `Authorization: Bearer-API {apiKey}` (Publer-like), or
    - `X-Api-Key: {apiKey}`.
  - Validates:
    - Parse key → find matching ApiKey by hash.
    - Check `IsActive`.
  - Creates `ClaimsPrincipal` with:
    - `sub` = `"apikey:{ApiKey.Id}"`.
    - `workspace` = `WorkspaceId`.
    - `scopes` = scopes from ApiKey.

- Configure authentication in `Program.cs`:
  - Keep existing JWT bearer for frontend.
  - Add API key auth scheme.
  - Use **policy-based authorization** with scopes.

---

## 4. Application Layer – API Key Service

In `SocialOrchestrator.Application`:

DTOs in `Api/Dto`:

- `ApiKeySummaryDto`:
  - `Guid Id`
  - `string Name`
  - `string[] Scopes`
  - `DateTime CreatedAt`
  - `DateTime? LastUsedAt`
  - `bool IsActive`

- `CreateApiKeyRequest`:
  - `string Name`
  - `string[] Scopes`

- `CreateApiKeyResponse`:
  - `ApiKeySummaryDto Key`
  - `string PlainTextKey` (shown only once after creation)

Interface: `IApiKeyService`:

- `Task<Result<CreateApiKeyResponse>> CreateApiKeyAsync(Guid workspaceId, Guid userId, CreateApiKeyRequest request);`
- `Task<Result<IReadOnlyList<ApiKeySummaryDto>>> ListApiKeysAsync(Guid workspaceId, Guid userId);`
- `Task<Result> RevokeApiKeyAsync(Guid workspaceId, Guid userId, Guid apiKeyId);`

Implementation in Infrastructure:

- Generate random key, hash it (e.g., using HMACSHA256).
- Store hash and metadata.
- Return plain text only once.

---

## 5. Application Layer – Webhook Service

DTOs in `Api/Dto`:

- `WebhookSubscriptionDto`:
  - `Guid Id`
  - `string Name`
  - `string TargetUrl`
  - `string[] EventTypes`
  - `bool IsActive`
  - `DateTime CreatedAt`
  - `DateTime? LastDeliveryAtUtc`

- `CreateWebhookSubscriptionRequest`:
  - `string Name`
  - `string TargetUrl`
  - `string[] EventTypes`

Interface: `IWebhookService`:

- `Task<Result<WebhookSubscriptionDto>> CreateSubscriptionAsync(Guid workspaceId, Guid userId, CreateWebhookSubscriptionRequest request);`
- `Task<Result<IReadOnlyList<WebhookSubscriptionDto>>> ListSubscriptionsAsync(Guid workspaceId, Guid userId);`
- `Task<Result> DeleteSubscriptionAsync(Guid workspaceId, Guid userId, Guid subscriptionId);`

Additionally, an internal interface `IWebhookDispatcher`:

- `Task EnqueueEventAsync(Guid workspaceId, string eventType, object payload);`

Implementation:

- `EnqueueEventAsync`:
  - Finds subscriptions for `workspaceId` where `EventTypes` contains `eventType`.
  - For each subscription, enqueues a Hangfire job to deliver webhook.

- Delivery job:
  - Serializes payload to JSON.
  - Signs request using subscription `Secret` (e.g., HMAC in header `X-SO-Signature`).
  - Sends POST to `TargetUrl`.
  - Records `WebhookDelivery` with status, response, retries.

Event types to support:

- `post.created`
- `post.scheduled`
- `post.published`
- `post.failed`
- `automation.rule.run`
- `media.uploaded`
- etc.

---

## 6. Public API Surface

We will expose a **versioned public API namespace**, e.g.:

- Base path: `/api/public/v1/`

Design choice:

- Keep existing internal controllers under `/api/...`.
- Add new controllers under `/api/public/v1/...` using API key auth.

### 6.1 Public Endpoints Categories

At minimum, include:

1. **Auth/Info**  
   - `GET /me` – returns workspace + API key scopes context.

2. **Workspaces & Accounts**  
   - `GET /workspaces` – list workspaces accessible via key (usually one).
   - `GET /workspaces/{workspaceId}/accounts` – list social accounts.

3. **Posts**  
   - `GET /workspaces/{workspaceId}/posts` – list posts (with filters similar to internal API).
   - `GET /workspaces/{workspaceId}/posts/{postId}` – get post detail.
   - `POST /workspaces/{workspaceId}/posts` – create posts with variants.
   - `POST /workspaces/{workspaceId}/posts/{postId}/publish-now` – optional manual trigger.

4. **Media**  
   - `GET /workspaces/{workspaceId}/media` – list media assets.
   - `POST /workspaces/{workspaceId}/media` – upload media (if you want to support external tools).

5. **Analytics**  
   - `GET /workspaces/{workspaceId}/analytics/overview`
   - `GET /workspaces/{workspaceId}/posts/{postId}/analytics`
   - `GET /workspaces/{workspaceId}/accounts/{accountId}/analytics`

6. **Automation**  
   - `GET /workspaces/{workspaceId}/automation/rules`
   - `POST /workspaces/{workspaceId}/automation/rules` (optionally allow programmatic rule creation).

7. **Webhooks**  
   - `GET /workspaces/{workspaceId}/webhooks`
   - `POST /workspaces/{workspaceId}/webhooks`
   - `DELETE /workspaces/{workspaceId}/webhooks/{id}`

> FOR CODING AGENTS:  
> - Do not expose internal-only endpoints (e.g., identity management, Hangfire, system admin) via public API.  
> - Use API key scopes to restrict access per endpoint.

---

## 7. API Documentation

Use Swagger/OpenAPI:

- Generate separate documentation for public API group (e.g., use `ApiExplorerSettings` and tags).
- Paths documented explicitly with:
  - Required headers (`Authorization: Bearer-API ...` or `X-Api-Key`).
  - Example requests/responses.
- Optionally publish static docs (Swagger UI endpoint) at `/docs/public-api` for users.

---

## 8. Integrations – Zapier, Make, etc.

Zapier/Make typically integrate via:

- Webhooks.
- Public REST API.

This phase’s design already provides:

- Webhook: event push.
- Public API: CRUD and analytics.

To optimize for Zapier/Make:

- Provide **clear event types** and payload structures for common flows:
  - New Post Created.
  - Post Published.
  - Post Failed.
  - Automation Rule Run Completed.
- Provide **simple endpoints** for actions:
  - Create draft.
  - Schedule post.
  - Upload media.
- Consider adding:
  - A dedicated “integration user” concept (or workspace-level API keys only).

You **do not** need a formal Zapier app configuration in this codebase, but your design must support it.

---

## 9. Frontend – API & Webhook Management UI

In Angular:

### 9.1 API Keys Management

- Add a section under workspace Settings:
  - List existing API keys (Name, scopes, last used, active).
  - Button to create new key:
    - Select scopes via checkboxes.
    - On create, show the plaintext key once with copy warning.
  - Ability to revoke keys.

### 9.2 Webhook Management

- Webhooks settings page under workspace Settings:
  - List subscriptions (Name, TargetUrl, EventTypes, last delivery status).
  - Form to create new webhook:
    - Name.
    - Target URL.
    - Events (multi-select).
  - Button to delete.
  - Optionally: test delivery to validate target.

---

## 10. Manual Verification Checklist (End of Phase 11)

1. **API Keys**:
   - You can create API keys and see them listed.
   - Using an API key, you can call `/api/public/v1/...` endpoints.
   - API key scopes are enforced (e.g., lack of `write:posts` prevents POST /posts).

2. **Webhooks**:
   - You can create webhook subscriptions for events.
   - When those events happen, HTTP POSTs are sent to target URL.
   - Delivery attempts and status are logged in `WebhookDeliveries`.
   - HMAC signature header is included and can be verified.

3. **Public API**:
   - Basic flows work end-to-end:
     - External script can create a draft, schedule a post, and observe publish via webhook.
   - Public API documentation is accurate and reachable.

4. **Security**:
   - Internal JWT-based endpoints for web app are still protected and not accessible via API keys.
   - No sensitive data is leaked in webhook payloads or API responses beyond spec.

---

## 11. Instructions for Automated Coding Agents

- Do not store plaintext API keys in the database; only hashes.
- Avoid leaking secrets (keys, webhook secrets) in logs or activity metadata.
- Always validate workspace from the API key and never allow a key to operate on another workspace.
- Any new public endpoint must:
  - Be versioned under `/api/public/v1/`.
  - Check scopes.
  - Be documented in Swagger.

This completes the specification for **Phase 11 – Public API & Integrations**.