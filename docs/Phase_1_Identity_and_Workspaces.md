# Phase 1 – Identity, Authentication, and Workspaces

**Audience:**  
- Solo developer implementing the backend and frontend.  
- Automated coding agents following explicit instructions.

**Goal of Phase 1:**  
Add **user accounts, authentication, and workspace management** on top of the Phase 0 skeleton.

After Phase 1 is completed:

- Users can register, log in, and log out.
- JWT tokens are issued and validated.
- Users can create and manage **Workspaces**.
- A user can belong to multiple workspaces with basic roles: Owner, Admin, Member.
- The Angular SPA has:
  - Auth pages (login/register).
  - Basic workspace selection/creation UI.

> IMPORTANT FOR CODING AGENTS:  
> - Only implement identity and workspace-related functionality described here.  
> - Do not implement social accounts, posts, scheduling, media, analytics, or automation in this phase.  
> - If something is not specified, add a `TODO` comment instead of inventing behavior.

---

## 1. Backend – Identity Model

### 1.1 User Entity (Domain Layer)

In `SocialOrchestrator.Domain`:

Create folder: `Users/`.

Create class: `Users/User.cs`

**User properties:**

- `Guid Id` (inherit from `EntityBase` if available).
- `string Email` (required, unique).
- `string NormalizedEmail` (for lookups).
- `string PasswordHash` (for ASP.NET Identity integration – or use IdentityUser separately).
- `string? DisplayName`.
- `DateTime CreatedAt`.
- `DateTime? UpdatedAt`.
- `bool IsActive`.

> Implementation choice:  
> You may use ASP.NET Identity's `IdentityUser<Guid>` directly in Infrastructure instead of a custom `User` entity in Domain. To keep things simple for a solo dev, use ASP.NET Identity’s built-in user type and treat `User` in Domain as a thin wrapper or avoid a Domain `User` entirely for now.  
> **To avoid confusion**, follow this rule:  
> - Use **ASP.NET Identity** as the primary user model; do **not** duplicate it in Domain for Phase 1.

Therefore, **for Phase 1**:

- Do **not** create a separate `User` class in Domain.  
- Work directly with `IdentityUser<Guid>` in Infrastructure and Application layers.

---

## 2. Backend – ASP.NET Identity Setup

### 2.1 Add Identity to Infrastructure

In `SocialOrchestrator.Infrastructure`:

1. Add NuGet packages:
   - `Microsoft.AspNetCore.Identity.EntityFrameworkCore`
   - `Microsoft.EntityFrameworkCore.SqlServer` (already added in Phase 0)

2. Update `AppDbContext`:

- Change class definition to:

  - Inherit from `IdentityDbContext<IdentityUser<Guid>, IdentityRole<Guid>, Guid>`.

- Ensure constructor remains `AppDbContext(DbContextOptions<AppDbContext> options)`.

- In `OnModelCreating`:
  - Call `base.OnModelCreating(modelBuilder)`.

3. Update `DependencyInjection.AddInfrastructure`:

- Register Identity:

  ```csharp
  services
      .AddIdentity<IdentityUser<Guid>, IdentityRole<Guid>>()
      .AddEntityFrameworkStores<AppDbContext>()
      .AddDefaultTokenProviders();
  ```

- Ensure `AddDbContext<AppDbContext>` is already configured with SQL Server.

> Do not configure Identity options beyond the minimum required (password complexity, etc.) in this phase; add TODO if needed.

### 2.2 JWT Authentication Configuration

In `SocialOrchestrator.Api`:

1. Add NuGet package:
   - `Microsoft.AspNetCore.Authentication.JwtBearer`

2. In `appsettings.json`, add:

```json
"Jwt": {
  "Issuer": "SocialOrchestrator",
  "Audience": "SocialOrchestratorClient",
  "Key": "REPLACE_WITH_A_SECURE_RANDOM_KEY"
}
```

- `Key` must be replaced in real environments; in dev, you can use any long random string.

3. In `Program.cs`:

- Configure JWT authentication:

  - Add `builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)...`
  - Configure token validation parameters:
    - Validate issuer, audience, lifetime, and signing key.

- Add `app.UseAuthentication();` before `app.UseAuthorization();`.

> FOR CODING AGENTS:  
> - Do not introduce additional auth schemes in this phase.  
> - Use **only** JWT bearer authentication for API consumers (Angular frontend).

---

## 3. Backend – Workspace Model

### 3.1 Domain: Workspace Entities

In `SocialOrchestrator.Domain`:

Create folder: `Workspaces/`.

Create class: `Workspaces/Workspace.cs`

Properties:

- `Guid Id`
- `string Name` (required, max length 200).
- `string Slug` (URL-friendly name, unique per system).
- `Guid OwnerUserId`
- `string TimeZone` (IANA or Windows ID; store as string).
- `DateTime CreatedAt`
- `DateTime? UpdatedAt`

Create class: `Workspaces/WorkspaceMember.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `Guid UserId`
- `WorkspaceRole Role` (enum)
- `DateTime JoinedAt`

Create enum: `Workspaces/WorkspaceRole.cs`

Values:

- `Owner = 1`
- `Admin = 2`
- `Member = 3`

> Do not add other roles (e.g., Client) in this phase.

### 3.2 Infrastructure: EF Core Configuration

In `SocialOrchestrator.Infrastructure`:

1. In `AppDbContext`:

- Add `DbSet<Workspace> Workspaces { get; set; }`
- Add `DbSet<WorkspaceMember> WorkspaceMembers { get; set; }`

2. Configure entity mapping (either via `OnModelCreating` or separate configuration classes):

For `Workspace`:

- Table name: `Workspaces`.
- Primary key: `Id`.
- Unique index on `Slug`.
- Required fields: `Name`, `Slug`, `OwnerUserId`, `TimeZone`.

For `WorkspaceMember`:

- Table name: `WorkspaceMembers`.
- Primary key: `Id`.
- Foreign keys:
  - `WorkspaceId` → `Workspaces.Id`.
  - `UserId` → `AspNetUsers.Id` (from Identity).
- Composite unique index on `(WorkspaceId, UserId)`.

3. Create and apply migration:

- Name: `Phase1_IdentityAndWorkspaces`.
- Run `dotnet ef migrations add Phase1_IdentityAndWorkspaces` from `SocialOrchestrator.Api` (or Infrastructure) project.
- Run `dotnet ef database update`.

> FOR CODING AGENTS:  
> - Do not modify Identity tables other than via migrations generated by EF.  
> - Ensure the migration only includes tables described above.

---

## 4. Backend – Application Layer (Use Cases)

In `SocialOrchestrator.Application`, create:

### 4.1 DTOs

Create folder: `Identity/Dto`.

- `RegisterUserRequest`:
  - `string Email`
  - `string Password`
  - `string? DisplayName`

- `LoginRequest`:
  - `string Email`
  - `string Password`

- `LoginResponse`:
  - `string AccessToken`
  - `DateTime ExpiresAt`
  - `Guid UserId`
  - `string Email`

Create folder: `Workspaces/Dto`.

- `CreateWorkspaceRequest`:
  - `string Name`
  - `string? TimeZone`

- `WorkspaceSummaryDto`:
  - `Guid Id`
  - `string Name`
  - `string Slug`
  - `string TimeZone`
  - `WorkspaceRole Role` (role of current user in that workspace)

### 4.2 Services

Create folder: `Identity/Services`.

- `IAuthService`:
  - `Task<Result> RegisterAsync(RegisterUserRequest request)`
  - `Task<Result<LoginResponse>> LoginAsync(LoginRequest request)`

Create folder: `Workspaces/Services`.

- `IWorkspaceService`:
  - `Task<Result<WorkspaceSummaryDto>> CreateWorkspaceAsync(Guid userId, CreateWorkspaceRequest request)`
  - `Task<Result<IReadOnlyList<WorkspaceSummaryDto>>> GetUserWorkspacesAsync(Guid userId)`

> Use the `Result` type from Domain (or Application) as defined in Phase 0.

---

## 5. Backend – Infrastructure Implementations

In `SocialOrchestrator.Infrastructure`:

### 5.1 Auth Service Implementation

Create folder: `Identity/`.

Create class: `Identity/AuthService.cs` that implements `IAuthService`.

Responsibilities:

- `RegisterAsync`:
  - Check if user with given email exists.
  - Create `IdentityUser<Guid>` with Email, UserName = Email.
  - Set `EmailConfirmed = true` (or leave confirmation for later).
  - Use `UserManager` to create user with password.
  - Return `Result.Success()` or `Result.Failure("...")`.

- `LoginAsync`:
  - Find user by email.
  - Check password.
  - If valid, generate JWT token using configured JWT options.
    - Include claims:
      - `sub` = user Id
      - `email` = user email
  - Return `LoginResponse` with token and expiry.

Inject:

- `UserManager<IdentityUser<Guid>>`
- `SignInManager<IdentityUser<Guid>>` (optional).
- `IConfiguration` or an options class for JWT settings.

Register this service in `DependencyInjection.AddInfrastructure`:

- `services.AddScoped<IAuthService, AuthService>();`

### 5.2 Workspace Service Implementation

Create folder: `Workspaces/`.

Create class: `Workspaces/WorkspaceService.cs` that implements `IWorkspaceService`.

Responsibilities:

- `CreateWorkspaceAsync`:
  - Validate `Name` is not empty.
  - Generate `Slug` from `Name` (e.g., lowercased, hyphen-separated).
  - Ensure `Slug` is unique:
    - If collision, append a suffix (`-2`, `-3`, etc.).
  - Create `Workspace` with:
    - `OwnerUserId = userId`.
    - `TimeZone = request.TimeZone` or default (e.g., "UTC").
  - Create `WorkspaceMember` for the owner with Role = `Owner`.
  - Save changes in `AppDbContext`.
  - Return `WorkspaceSummaryDto`.

- `GetUserWorkspacesAsync`:
  - Query `WorkspaceMembers` where `UserId = userId`.
  - Join with `Workspaces` to get details.
  - Map to `WorkspaceSummaryDto` with appropriate Role.

Register service:

- `services.AddScoped<IWorkspaceService, WorkspaceService>();`

---

## 6. Backend – API Controllers

In `SocialOrchestrator.Api`:

### 6.1 AuthController

Create folder: `Controllers`.

Create `AuthController`:

- Route: `[Route("api/[controller]")]` → `/api/auth`
- Endpoints:

1. `POST /api/auth/register`
   - Accepts `RegisterUserRequest`.
   - Calls `IAuthService.RegisterAsync`.
   - Returns:
     - `400 Bad Request` with error message on failure.
     - `200 OK` on success.

2. `POST /api/auth/login`
   - Accepts `LoginRequest`.
   - Calls `IAuthService.LoginAsync`.
   - Returns:
     - `400 Bad Request` on failure.
     - `200 OK` with `LoginResponse` on success.

### 6.2 WorkspacesController

Create `WorkspacesController`:

- Route: `[Route("api/[controller]")]` → `/api/workspaces`
- Add `[Authorize]` attribute to the controller.

Endpoints:

1. `POST /api/workspaces`
   - Accepts `CreateWorkspaceRequest`.
   - Gets current user Id from JWT:
     - Read `sub` claim and parse as `Guid`.
   - Calls `IWorkspaceService.CreateWorkspaceAsync`.
   - Returns:
     - `400 Bad Request` with error on failure.
     - `200 OK` with `WorkspaceSummaryDto` on success.

2. `GET /api/workspaces`
   - Gets current user Id from JWT.
   - Calls `IWorkspaceService.GetUserWorkspacesAsync`.
   - Returns list of `WorkspaceSummaryDto`.

> FOR CODING AGENTS:  
> - Do not add other workspace endpoints (update, delete) in this phase.  
> - All endpoints must return consistent JSON shape (no HTML pages).

---

## 7. Frontend – Auth and Workspace UI

In `social-orchestrator-web` Angular app:

### 7.1 Routing

Create feature modules:

- `auth` (lazy-loaded).
- `workspaces` (lazy-loaded).

Update `app-routing.module.ts` to:

- Route `/auth` → `AuthModule`.
- Route `/workspaces` → `WorkspacesModule`.
- Default route:
  - If not authenticated, redirect to `/auth/login`.
  - If authenticated, redirect to `/workspaces`.

### 7.2 Auth Module

Create `AuthModule` with:

- Components:
  - `LoginComponent`
  - `RegisterComponent`

- `AuthService` (Angular) that communicates with backend:

  - `login(email, password)` → POST `/api/auth/login`.
  - `register(email, password, displayName)` → POST `/api/auth/register`.
  - Store JWT token in `localStorage` or memory.
  - Provide method `getAccessToken()` for HTTP interceptor.

- HTTP interceptor:
  - Attach `Authorization: Bearer {token}` header to API requests for authenticated routes.

### 7.3 Workspace Module

Create `WorkspacesModule` with:

- `WorkspaceListComponent`:
  - On init, calls `GET /api/workspaces`.
  - Displays list of workspaces.
  - Includes button “Create Workspace”.

- `CreateWorkspaceComponent` (dialog or page):
  - Form fields:
    - Name (required).
    - TimeZone (dropdown; can start with a small static list, e.g. ["UTC"] and expand later).
  - On submit, calls `POST /api/workspaces`.

Basic flow:

- After login, navigate to `/workspaces`.
- If no workspaces, show prompt to create one.
- When workspace is created, show it in the list.

> Do not implement switching “active workspace” logic yet; just list and create them.

---

## 8. Manual Verification Checklist (End of Phase 1)

1. **Auth**:
   - You can register a new user.
   - You can log in and receive a JWT token.
   - Authenticated requests with `Authorization: Bearer <token>` work.

2. **Workspaces**:
   - You can create a workspace via API.
   - You can fetch your workspaces via API.
   - Owner role is assigned correctly.

3. **Angular**:
   - You can register and log in from the UI.
   - After login, you can create a workspace and see it in the list.

4. **Database**:
   - `AspNetUsers`, `AspNetRoles`, `AspNetUserRoles` tables exist (from Identity).
   - `Workspaces` and `WorkspaceMembers` tables exist.
   - Data persists across restarts.

---

## 9. Instructions for Automated Coding Agents

- Only use file and type names specified in this document.
- Do not introduce unrelated endpoints or UI features.
- When reading user Id from JWT, always use the `sub` claim.
- If any behavior is unclear (e.g., password strength rules), choose a minimal valid configuration and add a `// TODO:` comment.
- After completing this phase’s tasks, stop and wait for the next phase document (Phase 2) before adding any new features.

This completes the specification for **Phase 1 – Identity, Authentication, and Workspaces**.