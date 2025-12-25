# Phase 2 – Social Accounts and OAuth Integration

**Audience:**  
- Solo developer implementing social account connections.  
- Automated coding agents implementing backend and basic UI.

**Goal of Phase 2:**  
Allow users to connect social media accounts (e.g., Facebook, Instagram, X/Twitter, LinkedIn) to a workspace using OAuth, and store tokens securely for later publishing and analytics.

After Phase 2 is completed:

- Each workspace can have multiple **SocialAccounts** attached.
- Users can start and complete OAuth flows for supported providers.
- Access/refresh tokens are stored securely and linked to `SocialAccount`.
- The Angular SPA has:
  - Workspace-level page to list, connect, and disconnect social accounts.

> IMPORTANT FOR CODING AGENTS:  
> - Do not implement post creation or publishing in this phase.  
> - Only implement data structures and flows needed for connecting accounts and storing tokens.  
> - If the behavior for a specific provider is not fully specified, add a `TODO` comment and keep implementation minimal.

---

## 1. Supported Providers in Phase 2

In this phase, implement **the integration framework** plus **one concrete provider** end-to-end. Recommended:

- Facebook (Pages) as the first fully working provider.

Design the provider abstraction so that later providers (Instagram, X/Twitter, LinkedIn) can be added easily without changing core code.

---

## 2. Backend – Domain Model for Social Accounts

In `SocialOrchestrator.Domain`:

Create folder: `SocialAccounts/`.

### 2.1 SocialNetworkType Enum

File: `SocialAccounts/SocialNetworkType.cs`

Enum values (at minimum):

- `Facebook = 1`
- `Instagram = 2`
- `Twitter = 3`
- `LinkedIn = 4`

Do not add other networks yet; add them later as needed.

### 2.2 SocialAccount Entity

File: `SocialAccounts/SocialAccount.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `SocialNetworkType NetworkType`
- `string ExternalAccountId`  
  - Provider-specific ID (e.g., page ID).
- `string Name`  
  - Display name (e.g., Page name).
- `string? Username`  
  - Handle/username if applicable.
- `bool IsActive`
- `bool RequiresReauthorization`
- `DateTime CreatedAt`
- `DateTime? UpdatedAt`

### 2.3 SocialAuthToken Entity

File: `SocialAccounts/SocialAuthToken.cs`

Properties:

- `Guid Id`
- `Guid SocialAccountId`
- `string AccessTokenEncrypted`
- `string? RefreshTokenEncrypted`
- `DateTime? ExpiresAtUtc`
- `string[] Scopes` (can be stored as a single string in DB, e.g., JSON or comma-separated).
- `DateTime CreatedAt`
- `DateTime? UpdatedAt`

> For Phase 2, scopes can be stored as a simple string. Represent them in code as `string` and later refactor to a richer structure when needed.

---

## 3. Backend – Infrastructure: EF Core Configuration

In `SocialOrchestrator.Infrastructure`:

### 3.1 DbContext

Update `AppDbContext`:

- Add `DbSet<SocialAccount> SocialAccounts { get; set; }`
- Add `DbSet<SocialAuthToken> SocialAuthTokens { get; set; }`

### 3.2 Entity Configuration

Configure `SocialAccount`:

- Table name: `SocialAccounts`.
- Primary key: `Id`.
- Index on `(WorkspaceId, NetworkType)`.
- Required fields: `WorkspaceId`, `NetworkType`, `ExternalAccountId`, `Name`.

Configure `SocialAuthToken`:

- Table name: `SocialAuthTokens`.
- Primary key: `Id`.
- Unique index on `SocialAccountId` (one token record per account at a time).
- Required fields: `SocialAccountId`, `AccessTokenEncrypted`.

Run EF migration:

- Name: `Phase2_SocialAccountsAndOAuth`.
- Ensure it only adds the `SocialAccounts` and `SocialAuthTokens` tables and any necessary indexes.

---

## 4. Backend – Provider Abstraction

In `SocialOrchestrator.Domain` or `SocialOrchestrator.Application` (prefer Application):

Create folder: `Social/Providers/`.

### 4.1 Interface: ISocialAuthProvider

File: `Social/Providers/ISocialAuthProvider.cs`

Methods:

- `SocialNetworkType NetworkType { get; }`
- `string GetAuthorizationUrl(Guid workspaceId, Guid userId, string state)`
  - Returns the URL that the frontend should redirect the user to initiate OAuth.
  - `state` is a random string used for CSRF protection and to encode context if needed.

- `Task<OAuthCallbackResult> HandleCallbackAsync(string code, string state)`
  - Handles provider’s callback:
    - Exchanges `code` for tokens.
    - Fetches account details (id, name, username).
    - Returns an `OAuthCallbackResult`.

### 4.2 DTO: OAuthCallbackResult

File: `Social/Providers/OAuthCallbackResult.cs`

Properties:

- `bool IsSuccess`
- `string? ErrorMessage`
- `SocialNetworkType NetworkType`
- `string ExternalAccountId`
- `string AccountName`
- `string? AccountUsername`
- `string AccessToken`
- `string? RefreshToken`
- `DateTime? ExpiresAtUtc`
- `string[] Scopes`

---

## 5. Backend – Facebook Provider Implementation (Example)

In `SocialOrchestrator.Infrastructure`:

Create folder: `Social/Providers/Facebook/`.

### 5.1 Configuration

Create class: `FacebookOptions` with properties:

- `string ClientId`
- `string ClientSecret`
- `string AuthorizationEndpoint`
- `string TokenEndpoint`
- `string RedirectUri`
- `string[] DefaultScopes`

Add section to `appsettings.json`:

```json
"Facebook": {
  "ClientId": "REPLACE_ME",
  "ClientSecret": "REPLACE_ME",
  "AuthorizationEndpoint": "https://www.facebook.com/v19.0/dialog/oauth",
  "TokenEndpoint": "https://graph.facebook.com/v19.0/oauth/access_token",
  "RedirectUri": "https://your-domain.com/api/oauth/facebook/callback",
  "DefaultScopes": [ "pages_show_list", "pages_manage_posts", "public_profile" ]
}
```

> Replace domain and scopes as needed. For local dev, use `https://localhost:5001/api/oauth/facebook/callback`.

### 5.2 FacebookAuthProvider

Create class: `FacebookAuthProvider` implementing `ISocialAuthProvider`.

Responsibilities:

- `NetworkType` returns `SocialNetworkType.Facebook`.

- `GetAuthorizationUrl`:
  - Build URL with:
    - `client_id`
    - `redirect_uri`
    - `state` (should include workspaceId and userId encoded, or just a random string stored server-side).
    - `scope` (from `FacebookOptions.DefaultScopes`).
    - `response_type=code`.

- `HandleCallbackAsync`:
  - Validate `state` (for now, minimal validation; later, store state in DB or cache).
  - Exchange `code` for `access_token` via `TokenEndpoint`.
  - Call Facebook Graph API to fetch page/account information:
    - For Phase 2, keep this minimal: fetch one page or account.
  - Return `OAuthCallbackResult` with token and account info.

> FOR CODING AGENTS:  
> - If the exact Graph API endpoints or fields are not known, add `// TODO` comments and implement a minimal HTTP call that can be refined later.  
> - Do not add other providers (Instagram, etc.) in this phase, only design for them.

### 5.3 Register Provider

In `DependencyInjection.AddInfrastructure`:

- Register `FacebookAuthProvider` as implementation of `ISocialAuthProvider`.
- If multiple providers later, register them as `IEnumerable<ISocialAuthProvider>`.

Example:

```csharp
services.AddScoped<ISocialAuthProvider, FacebookAuthProvider>();
```

---

## 6. Backend – Social Account Application Services

In `SocialOrchestrator.Application`:

Create folder: `SocialAccounts/Dto`.

- `SocialAccountSummaryDto`:
  - `Guid Id`
  - `SocialNetworkType NetworkType`
  - `string Name`
  - `string? Username`
  - `bool IsActive`
  - `bool RequiresReauthorization`

Create folder: `SocialAccounts/Services`.

- `ISocialAccountService`:

Methods:

- `Task<Result<IReadOnlyList<SocialAccountSummaryDto>>> GetWorkspaceSocialAccountsAsync(Guid workspaceId)`
- `Task<Result<SocialAccountSummaryDto>> ConnectSocialAccountAsync(Guid workspaceId, OAuthCallbackResult oauthResult)`
- `Task<Result> DisconnectSocialAccountAsync(Guid workspaceId, Guid socialAccountId)`

Implementation in `SocialOrchestrator.Infrastructure`:

Create `SocialAccounts/SocialAccountService.cs`:

- `GetWorkspaceSocialAccountsAsync`:
  - Query `SocialAccounts` where `WorkspaceId = workspaceId`.
  - Map to `SocialAccountSummaryDto`.

- `ConnectSocialAccountAsync`:
  - Check if account with same `ExternalAccountId` and `NetworkType` already exists for workspace.
    - If exists, update token and mark as `IsActive = true` and `RequiresReauthorization = false`.
    - Else, create new `SocialAccount` and associated `SocialAuthToken`.
  - Encrypt `AccessToken` and `RefreshToken` before saving.
    - For Phase 2, you may store plain text in dev with `// TODO: encrypt tokens` comment, but design assumes encryption.

- `DisconnectSocialAccountAsync`:
  - Set `IsActive = false`.
  - Optionally clear tokens or leave them; at minimum, mark `RequiresReauthorization = true`.

Register service in DI:

- `services.AddScoped<ISocialAccountService, SocialAccountService>();`

---

## 7. Backend – OAuth and SocialAccounts API

In `SocialOrchestrator.Api`:

### 7.1 OAuthController

Create `OAuthController`:

- Route: `[Route("api/[controller]")]` → `/api/oauth`.
- This controller handles redirects and callbacks.

Endpoints:

1. `GET /api/oauth/facebook/authorize`
   - `[Authorize]`
   - Query string: `workspaceId` (Guid).
   - Uses `ISocialAuthProvider` for Facebook.
   - Generates a `state` value (GUID or encoded JSON).
   - Returns 200 OK with:
     - `{ "authorizationUrl": "https://..." }`
   - (Frontend will redirect the browser there.)

2. `GET /api/oauth/facebook/callback`
   - Anonymous endpoint (called by provider).
   - Query parameters: `code`, `state`.
   - Calls `FacebookAuthProvider.HandleCallbackAsync(code, state)`.
   - Calls `ISocialAccountService.ConnectSocialAccountAsync` with resulting account data.
   - For Phase 2:
     - Return a simple HTML page with “Connection successful, you can close this window.”  
     - Or redirect back to frontend with a success/failure query param.

> For local dev, the callback URL should be `https://localhost:5001/api/oauth/facebook/callback` and must match the configured URL in the provider.

### 7.2 SocialAccountsController

Create `SocialAccountsController`:

- Route: `[Route("api/workspaces/{workspaceId:guid}/social-accounts")]`.
- `[Authorize]` on the controller.

Endpoints:

1. `GET /api/workspaces/{workspaceId}/social-accounts`
   - Validate that the current user is a member of the workspace.
   - Calls `ISocialAccountService.GetWorkspaceSocialAccountsAsync(workspaceId)`.
   - Returns list of `SocialAccountSummaryDto`.

2. `DELETE /api/workspaces/{workspaceId}/social-accounts/{socialAccountId}`
   - Validate user membership and permission.
   - Calls `ISocialAccountService.DisconnectSocialAccountAsync(workspaceId, socialAccountId)`.
   - Returns `200 OK` or `204 No Content` on success.

> FOR CODING AGENTS:  
> - Do not add endpoints for editing account name/username yet.  
> - Do not implement posting/publishing in this controller.

---

## 8. Frontend – Social Accounts UI

In Angular app (`social-orchestrator-web`):

### 8.1 Workspace Context (Temporary)

For now:

- When listing workspaces (Phase 1), allow user to click a workspace to navigate to `/workspaces/:workspaceId/social-accounts`.

Do not implement a global “active workspace” context yet; that can be done in a later phase.

### 8.2 Social Accounts Module

Create `SocialAccountsModule`:

- Route: `/workspaces/:workspaceId/social-accounts`.

Components:

1. `SocialAccountListComponent`:
   - On init:
     - Reads `workspaceId` from route params.
     - Calls `GET /api/workspaces/{workspaceId}/social-accounts`.
   - Displays accounts in a table or list:
     - Network type, name, username, status.
   - Buttons:
     - “Connect Facebook” → triggers OAuth authorize call.
     - “Disconnect” button for each existing account → calls `DELETE`.

2. `ConnectButtonComponent` (optional):
   - A simple button that when clicked:
     - Calls `GET /api/oauth/facebook/authorize?workspaceId=...`.
     - Reads `authorizationUrl` from response.
     - Uses `window.location.href = authorizationUrl` to redirect the browser.

### 8.3 HTTP Services

Create `SocialAccountApiService` (Angular):

- Methods:
  - `getSocialAccounts(workspaceId: string)`
    - GET `/api/workspaces/{workspaceId}/social-accounts`.
  - `disconnectSocialAccount(workspaceId: string, socialAccountId: string)`
    - DELETE `/api/workspaces/{workspaceId}/social-accounts/{socialAccountId}`.
  - `getFacebookAuthorizeUrl(workspaceId: string)`
    - GET `/api/oauth/facebook/authorize?workspaceId=...` and return the `authorizationUrl`.

---

## 9. Manual Verification Checklist (End of Phase 2)

1. **Database**:
   - `SocialAccounts` and `SocialAuthTokens` tables exist.
   - Migration `Phase2_SocialAccountsAndOAuth` applied successfully.

2. **API**:
   - `GET /api/workspaces/{workspaceId}/social-accounts` returns data (empty list initially).
   - `GET /api/oauth/facebook/authorize?workspaceId=...` returns a URL.
   - After completing Facebook OAuth flow:
     - A new `SocialAccount` row exists.
     - A `SocialAuthToken` row exists and is linked properly.

3. **Frontend**:
   - You can navigate from workspace list to social accounts page.
   - “Connect Facebook” button opens provider auth screen.
   - After successful connection, the account appears in the list.
   - “Disconnect” correctly marks the account as inactive (and optional token cleanup).

4. **Security**:
   - Only authenticated users can list/connect/disconnect social accounts.
   - Backend verifies that the user belongs to the workspace before allowing actions.

---

## 10. Instructions for Automated Coding Agents

- Use the exact file and class names specified in this document.
- Do not add support for other providers beyond Facebook in this phase (design is generic, but implementation is only required for one provider).
- If provider-specific details are unclear, add TODO and keep the implementation minimal and compilable.
- Do not implement publishing, scheduling, or analytics; these are handled in later phases.
- After completing all tasks in this document, stop and wait for Phase 3 instructions.

This completes the specification for **Phase 2 – Social Accounts and OAuth Integration**.