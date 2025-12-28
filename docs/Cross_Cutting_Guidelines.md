# Cross-Cutting Guidelines – SocialOrchestrator

**Audience:**  
- Solo developer implementing any phase.  
- Automated coding agents executing code changes for any phase.

**Purpose:**  
Define **shared rules and practices** that apply to **all phases (0–14 and beyond)**, so that implementation is:

- Consistent.
- Secure.
- Testable.
- Avoids hidden assumptions and hallucinations.

Any time there is a conflict between this document and a phase document, the phase document wins for feature scope, but these cross-cutting rules still apply unless explicitly overridden.

---

## 1. Error Handling & Validation

1. All API endpoints must:
   - Validate input DTOs (required fields, length limits, enum values).
   - Return:
     - `400 Bad Request` for invalid input (with error details).
     - `401 Unauthorized` for missing/invalid auth.
     - `403 Forbidden` for permission/plan limit issues.
     - `404 Not Found` when entities are missing or not accessible to the caller.

2. Do **not** swallow exceptions silently:
   - Let unhandled exceptions bubble up to a global exception handler.
   - Global handler must:
     - Log detailed error (with correlation ID).
     - Return generic error message to client (no stack trace in production).

3. Use a consistent `Result` pattern internally:
   - When a method returns `Result` or `Result<T>`, do not throw for expected failures (e.g., “not found”), return failure with a clear error code/message instead.

4. Input validation should prefer:
   - Model validation attributes (e.g., `[Required]`, `[StringLength]`) where appropriate.
   - Additional manual checks in service layer when needed.

---

## 2. Logging & Observability

1. Use a structured logging library (Serilog or built-in ILogger) with:
   - Correlation ID per request (e.g., from header `X-Correlation-Id` or generated).
   - Key fields for major operations:
     - `WorkspaceId`, `UserId`, `SocialAccountId`, `PostId`, `JobId`, `RuleId`, `Region`, etc.

2. Log levels:
   - `Error`: unexpected exceptions, failed background jobs after retries.
   - `Warning`: transient issues, soft limit hits.
   - `Information`: major lifecycle events (post created, published, rule executed).
   - `Debug/Trace`: optional low-level details during development.

3. Background jobs must always log:
   - Job type and ID.
   - Entities involved.
   - Outcome (success/failure + error message).

4. Do not log:
   - Access tokens, secrets, passwords.
   - Full webhook payloads containing sensitive user PII (log IDs and summaries instead).

---

## 3. Security & Privacy

### 3.1 Authentication & Authorization

1. Auth schemes:
   - JWT bearer: for web app / SPA.
   - API key: for public API (Phase 11).
   - External SSO (OIDC): for enterprise (Phase 13).

2. Every controller must:
   - Use `[Authorize]` by default, except explicitly public endpoints (e.g., Stripe webhooks, OAuth callbacks, health checks).
   - Validate workspace membership and appropriate roles.

3. For workspace access:
   - Every business operation must ensure:
     - The current principal has a `WorkspaceId` context (from JWT or API key).
     - Entities loaded must belong to that workspace.

### 3.2 Secrets & Sensitive Data

1. Secrets:
   - Store in environment variables or config files not committed to version control.
   - Use a secrets store (e.g., user secrets, OS-level secret store) in dev.

2. Encryption:
   - Social network tokens, API keys, SSO client secrets should be encrypted at rest.
   - Use Data Protection APIs or a symmetric encryption key loaded from config.

3. PII:
   - Limit stored personal data to what is necessary (email, name).
   - Provide ability to delete user data upon request (GDPR-style).

---

## 4. Background Jobs – Reliability & Idempotency

1. All background jobs (Hangfire) must be **idempotent**:
   - Publishing job should check state (e.g., `PostVariant.State`) and not double-publish if already published.
   - Analytics ingestion should be safe to rerun for a given date range without duplicating rows; use upsert or unique keys.

2. Retries:
   - Use built-in retry mechanisms (with backoff).
   - After max retries, mark job as failed and create notifications/activity entries when appropriate.

3. Job registration:
   - Job setup must respect `Jobs:RunInThisRegion` flag (Phase 13).
   - Only one region should run recurring jobs in multi-region setups.

---

## 5. Configuration & Environments

1. Configuration hierarchy:
   - `appsettings.json` → `appsettings.{Environment}.json` → environment variables.
   - Do not hard-code environment-specific values in code.

2. Separate environments:
   - Development (local).
   - Staging.
   - Production.

3. Behavior differences:
   - In Development:
     - Swagger enabled.
     - Detailed error pages allowed.
   - In Production:
     - Swagger optionally restricted (e.g., behind auth).
     - Generic error responses only.

---

## 6. Testing Strategy

For **each phase**, aim for at least:

1. Unit tests:
   - Key application services (e.g., `PostService`, `AutomationExecutor`, `AnalyticsService`).
   - Core domain logic (validators, schedulers, rule evaluators).

2. Integration tests:
   - A small set of end-to-end API tests using in-memory or test SQL DB:
     - Auth flows.
     - Basic post creation and scheduling.
     - Automation rule execution for simple cases.
     - Analytics queries.

3. Manual / UI tests:
   - Run through happy paths via the Angular app:
     - Login, workspace selection.
     - Connecting accounts.
     - Creating/scheduling posts.
     - Checking analytics & automation.

4. Regression:
   - When adding new phases, ensure they do not break earlier functionality by running existing tests.

---

## 7. Performance & Scalability Basics

1. Database:
   - Use indexes as specified in each phase doc.
   - Avoid N+1 queries by using EF Include/ThenInclude sensibly for read-heavy paths.

2. API:
   - Always paginate list endpoints, with sensible defaults and maximum page sizes.
   - Avoid returning large blobs (e.g., media content) directly; use URLs.

3. Caching:
   - For now, in-process caching as needed (e.g., configuration, static lookup tables).
   - If you later introduce Redis, centralize caching logic so it’s optional.

4. Throttling:
   - Consider basic per-IP or per-API key rate limiting for sensitive endpoints.
   - Enforce API rate limits via middleware or gateway when needed.

---

## 8. Localization & Accessibility

1. Localization:
   - All user-visible strings in the frontend should be isolated for future i18n.
   - Backend messages should be machine-readable codes plus simple English messages; frontend can map codes to localized text later.

2. Accessibility:
   - Use semantic HTML elements where possible.
   - Ensure key flows are keyboard-accessible.
   - Provide alt text for images where required.

---

## 9. Data Migrations & Seeding

1. Migrations:
   - Use EF Core migrations per phase (`PhaseX_*` names).
   - Never hand-edit migration files unless necessary; if so, document it in comments.

2. Seeding:
   - Minimal seeding for:
     - Plans & PlanLimits (Phase 12).
     - Default roles if needed.
   - Use explicit seed scripts or migrations rather than magic data in code.

3. Backups:
   - For production, configure regular DB backups (outside the scope of this codebase, but required operationally).

---

## 10. Feature Flags

1. Use config flags for optional or heavy features:
   - AI advanced features (Phase 14).
   - Enterprise SSO/whitelabel (Phase 13).
   - Public API exposure (Phase 11).

2. Feature flags should:
   - Be read from configuration (no hard-coded toggles).
   - Be checked in controllers/services before heavy operations.

---

## 11. Guidance for Automated Coding Agents

- **Always read the relevant Phase document AND this Cross-Cutting guide** before making changes.
- When implementing a feature for a specific phase:
  - Keep security, logging, and error handling consistent with this document.
- Do not introduce new global patterns (e.g., home-grown logging) that conflict with these guidelines.
- If a Phase document appears to contradict this guide:
  - Follow the Phase doc for behavior.
  - Follow this guide for quality and cross-cutting concerns.

This document is part of the canonical specification for SocialOrchestrator and applies to all phases.