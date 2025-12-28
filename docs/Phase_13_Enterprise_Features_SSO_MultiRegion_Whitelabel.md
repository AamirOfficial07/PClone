# Phase 13 – Enterprise Features: SSO, Multi-Region, Whitelabel

**Audience:**  
- Solo developer preparing the product for enterprise customers.  
- Automated coding agents implementing optional but defined enterprise features.

**Goal of Phase 13:**  
Add enterprise-ready capabilities:

- Single Sign-On (SSO) via SAML/OIDC.  
- Multi-region deployment strategy (at design level).  
- Whitelabel/theming (per-workspace branding & domain).

These are defined as part of the system design, even if they are implemented after the core product is stable.

> IMPORTANT FOR CODING AGENTS:  
> - Focus on clear extension points and configuration.  
> - Do not break existing local dev/simple hosting flows.

---

## 1. SSO – Single Sign-On

### 1.1 Approach

Support at least one enterprise SSO protocol:

- **OIDC** (OpenID Connect) is recommended as primary.  
- SAML can be added later if needed by customers.

We integrate SSO in addition to existing local login (username/password).

### 1.2 Domain Model

In `SocialOrchestrator.Domain` (e.g., `Identity/`):

Create `SsoProvider` entity:

- `Guid Id`
- `Guid WorkspaceId` (or null for global SSO that crosses workspaces)
- `string Name` (e.g., “Acme SSO”)
- `string ProviderType` (`"OIDC"`, `"SAML"`)
- `string Authority` (OIDC authority URL)
- `string ClientId`
- `string ClientSecret` (encrypted)
- `string[] AllowedDomains` (e.g., `["acme.com"]`)
- `bool IsActive`
- `DateTime CreatedAt`

### 1.3 Infrastructure – EF Core

Add `DbSet<SsoProvider> SsoProviders` to `AppDbContext`.

Configure table `SsoProviders`.

Create migration:

- Name: `Phase13_Enterprise_SSO_MultiRegion_Whitelabel`.

Run `dotnet ef database update`.

### 1.4 ASP.NET Core Auth Configuration

In `SocialOrchestrator.Api`:

- Configure external authentication schemes dynamically based on `SsoProviders`:
  - For each OIDC provider, add `AddOpenIdConnect` with authority, clientId, clientSecret.
- Alternatively, configure a generic OIDC handler that reads provider config at runtime (selected by query string or path).

SSO login flow:

1. User clicks “Login with SSO” and selects provider (or enters email and system infers provider from domain).
2. Frontend redirects to `/api/auth/sso/{providerId}/challenge`.
3. Backend triggers OIDC challenge.
4. After successful login, callback endpoint:
   - Maps external identity to local `IdentityUser<Guid>`:
     - Use email claim.
     - Auto-create local user if not existing, attach to workspace(s) based on domain.
   - Issues JWT as usual.

> For coding agents:  
> - Implement OIDC pipeline, but keep SAML as TODO unless specifically requested.

---

## 2. Multi-Region Deployment Design

This phase is mostly architectural, not code-heavy, but must be documented.

### 2.1 Data Strategy

Options:

1. **Single primary region, read replicas** (simpler initial design).
2. **Multi-region active/passive**:
   - One region as primary (writes).
   - Secondary region(s) for DR (disaster recovery).

For now:

- Implement all code assuming **single write region**.  
- Prepare for region-awareness in configuration and logging:

Add config:

```json
"Region": {
  "Name": "eu-central-1"
}
```

Use region information in:

- Logs (tag each log entry with region).
- Scheduled jobs (only run certain jobs in primary region).

### 2.2 Background Jobs & Region

- Add a configuration flag:
  - `Jobs:RunInThisRegion = true/false`.
- For multi-region deployment:
  - Only enable jobs in primary region (to avoid duplicate publishing/analytics/automation).

Coding agents:

- When registering Hangfire jobs, check this flag:
  - If `false`, do not register recurring jobs.

### 2.3 Tenant Routing (Conceptual)

Multi-region per-tenant routing (not required in code now):

- DNS/load balancer directs a tenant (workspace) to its region based on config.
- Per-tenant metadata could include `PreferredRegion`.

In Domain:

- Optional field `string? Region` on `Workspace` can be added to plan for region-based placement.

---

## 3. Whitelabel & Theming

### 3.1 Domain Model

In `Workspaces/WorkspaceSettings` (Phase 1), extend with:

- `string? CustomDomain` (e.g., `social.acme.com`).
- `string? PrimaryColor`
- `string? SecondaryColor`
- `string? LogoUrl`
- `bool IsWhitelabelEnabled`

### 3.2 Infrastructure – Routing & Branding

Routing:

- Use host-based routing in frontend/backends:
  - Map `CustomDomain` to a workspace.
  - On each request, determine `Workspace` from host (or from path for default domain).
- Backend:
  - Provide a `GET /api/workspaces/{workspaceId}/branding` endpoint.
- Frontend:
  - On app init, call branding endpoint to configure:
    - Colors (Angular theming).
    - Logo.
    - Title.

### 3.3 Email/Theming

- Notifications emails (Phase 10):
  - Use workspace logo and colors if `IsWhitelabelEnabled`.
- Optional:
  - Custom sender addresses (e.g., via workspace-specific SMTP config).
  - Keep this configurable but not required in initial implementation.

---

## 4. Enterprise-Only Admin Features

Add optional flags on workspaces:

In `WorkspaceSettings`:

- `bool IsEnterprise`
- `bool SsoRequired` (only SSO login, no local passwords).

Backend enforcement:

- If `SsoRequired = true`:
  - Block local password login for users belonging exclusively to that workspace.
- Optionally:
  - Display error message guiding users to SSO.

---

## 5. API & UI for Enterprise Settings

### 5.1 Backend – EnterpriseSettingsController

Route: `/api/workspaces/{workspaceId:guid}/enterprise-settings`

Endpoints (`[Authorize]` Owner/Admin only):

- `GET /` – returns enterprise-related settings (SSO providers, whitelabel, flags).
- `PUT /` – update whitelabel settings (CustomDomain, colors, logo, IsWhitelabelEnabled, SsoRequired).
- `POST /sso-providers` – create SSO provider config (OIDC).
- `GET /sso-providers` – list providers.
- `DELETE /sso-providers/{id}` – delete provider config.

### 5.2 Frontend – Enterprise Settings UI

In Angular:

- Under workspace Settings, add `Enterprise` section:
  - Whitelabel:
    - Inputs for custom domain, logo upload (or URL), colors, toggle IsWhitelabelEnabled.
  - SSO:
    - List SSO providers.
    - Create/edit OIDC provider:
      - Authority, clientId, clientSecret, allowed domains.
  - Flags:
    - Toggle SsoRequired (with warning).

---

## 6. Manual Verification Checklist (End of Phase 13)

1. **SSO**:
   - You can configure an OIDC provider for a workspace.
   - “Login with SSO” redirects to provider and logs in user.
   - Local accounts are autocreated/map correctly from external identity.
   - If `SsoRequired` is enabled, password login is blocked as intended.

2. **Multi-Region Readiness**:
   - Region name and job flags are configurable.
   - When `Jobs:RunInThisRegion = false`, recurring jobs are not registered.
   - Logs include region info.

3. **Whitelabel**:
   - You can set branding and custom domain for a workspace.
   - UI loads correct theme per workspace/host.
   - Emails use workspace branding if enabled.

4. **Enterprise Settings UI**:
   - Controlled by workspace-level roles (Owner/Admin only).
   - Changes are persisted and reflected in behavior (login, branding).

---

## 7. Instructions for Automated Coding Agents

- Keep SSO configuration optional; if no providers are configured, default to existing email/password login.
- Do not break existing routing by introducing whitelabel; ensure default domain path still works.
- Do not attempt to implement full multi-region deployment within code; honor the configuration flags and keep code region-aware.
- For any SAML or additional SSO protocols not implemented, add clear `TODO` markers in code and docs.

This completes the specification for **Phase 13 – Enterprise Features: SSO, Multi-Region, Whitelabel**.