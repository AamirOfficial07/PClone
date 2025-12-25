# Phase 0 – Project Setup and Architecture Foundation

**Audience:**  
- Primary: You (solo developer).  
- Secondary: Automated coding agents that will implement code based on this document.

**Goal of Phase 0:**  
Create a **stable project skeleton** for the backend and frontend with:

- Solution and project structure in .NET.  
- Angular workspace and base app shell.  
- Shared conventions and naming.  
- No real business features yet (no posts, analytics, etc.).  

After Phase 0 is completed, the project should:

- Build and run with a minimal health-check endpoint.  
- Serve a placeholder Angular SPA.  
- Have a clear layout for all future features.

> IMPORTANT FOR CODING AGENTS:  
> - Do not add business entities (Post, Workspace, etc.) in this phase.  
> - Only create the structure and generic cross-cutting pieces described below.  
> - If something is not specified, leave it as a TODO comment instead of inventing behavior.

---

## 1. Repository Structure

Create the following directory layout at the repository root:

```text
/ (repo root)
  docs/
    SocialOrchestral_System_Design.md
    Phase_0_Project_Setup_and_Architecture.md
    (other phase docs will be added later)
  src/
    Server/
    Client/
  tests/
```

- Do **not** place source code directly under the root.  
- All backend code goes under `src/Server`.  
- All frontend code goes under `src/Client`.  
- All tests go under `tests`.

---

## 2. Backend Solution and Projects

### 2.1 Create Solution

At `src/Server`, create the solution:

- Solution name: `SocialOrchestrator.sln`

### 2.2 Create Projects

Create four .NET projects inside `src/Server`:

1. `SocialOrchestrator.Domain`
   - Type: Class Library (.NET 8)
   - Purpose: Domain entities, value objects, domain services.
   - No references to other projects.

2. `SocialOrchestrator.Application`
   - Type: Class Library (.NET 8)
   - Purpose: Application services, use cases, DTOs.
   - References:
     - Reference `SocialOrchestrator.Domain`.

3. `SocialOrchestrator.Infrastructure`
   - Type: Class Library (.NET 8)
   - Purpose: EF Core, repository implementations, external service clients, media storage implementation.
   - References:
     - Reference `SocialOrchestrator.Domain`.
     - Reference `SocialOrchestrator.Application`.

4. `SocialOrchestrator.Api`
   - Type: ASP.NET Core Web API (.NET 8)
   - Purpose: API endpoints, DI configuration, middleware.
   - References:
     - Reference `SocialOrchestrator.Application`.
     - Reference `SocialOrchestrator.Infrastructure`.

### 2.3 Project References (Explicit Instructions)

For coding agents:

- In `SocialOrchestrator.Application.csproj`:
  - Add a `ProjectReference` to `SocialOrchestrator.Domain`.

- In `SocialOrchestrator.Infrastructure.csproj`:
  - Add a `ProjectReference` to:
    - `SocialOrchestrator.Domain`
    - `SocialOrchestrator.Application`

- In `SocialOrchestrator.Api.csproj`:
  - Add a `ProjectReference` to:
    - `SocialOrchestrator.Application`
    - `SocialOrchestrator.Infrastructure`

Do **not** create circular references.

---

## 3. Backend: Basic Configuration

### 3.1 Domain Project (Phase 0 Scope)

In `SocialOrchestrator.Domain`:

- Create folder: `Common/`.
- Add the following simple types:

1. `Common/EntityBase.cs`
   - Abstract base class for entities with `Id` (Guid) and audit properties:
     - `Guid Id`
     - `DateTime CreatedAt`
     - `DateTime? UpdatedAt`

2. `Common/ValueObject.cs`
   - Abstract class for value objects following typical DDD pattern (equality by components).

3. `Common/Result.cs`
   - A basic operation result type (Success, Error messages).  
   - Contains:
     - `bool IsSuccess`
     - `string? Error`
     - `static Result Success()`
     - `static Result Failure(string error)`

> Do not add domain entities like `User`, `Workspace`, `Post` in Phase 0.

### 3.2 Application Project (Phase 0 Scope)

In `SocialOrchestrator.Application`:

- Create `Common/` folder.
- Add:

1. `Common/IApplicationServiceMarker.cs`
   - An empty marker interface (used only for DI scanning later).

2. `Common/PagedResult<T>.cs`
   - Generic pagination result type:
     - `IReadOnlyList<T> Items`
     - `int PageNumber`
     - `int PageSize`
     - `int TotalCount`

No actual use-cases or business services yet.

### 3.3 Infrastructure Project (Phase 0 Scope)

In `SocialOrchestrator.Infrastructure`:

- Create folders:
  - `Persistence/`
  - `Logging/`
  - `Configuration/`
  - `Services/` (empty for now)

#### 3.3.1 Persistence – DbContext Skeleton

Create:

- `Persistence/AppDbContext.cs`

Contents:

- Derive from `DbContext`.
- Add constructor accepting `DbContextOptions<AppDbContext>`.
- Do **not** add `DbSet<...>` yet (no domain entities in this phase).
- Ensure `OnModelCreating` calls `base.OnModelCreating(modelBuilder)` and is otherwise empty.

#### 3.3.2 Infrastructure Dependency Injection

Create:

- `DependencyInjection.cs` at project root (`SocialOrchestrator.Infrastructure`).

This class should contain a static method:

```csharp
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // In Phase 0: only register AppDbContext.
        // Database provider details (connection string) will be defined in 3.4.

        return services;
    }
}
```

> In Phase 0 do not add real connection strings or providers yet. Leave TODO comments.

### 3.4 API Project (Startup Skeleton)

In `SocialOrchestrator.Api`:

1. Ensure the project uses **minimal hosting model** (Program.cs only, no Startup class).

2. `Program.cs` must include:

- `builder.Services.AddControllers();`
- `builder.Services.AddEndpointsApiExplorer();`
- `builder.Services.AddSwaggerGen();`
- Call `services.AddInfrastructure(configuration);` (from Infrastructure project) once the `DependencyInjection` method is implemented with real logic in later phases.

3. Middleware pipeline:

- Use Swagger in `Development` environment.
- Use HTTPS redirection.
- Use authorization (even if no policies yet).
- Map controllers.

4. Create a simple health-check controller:

- Namespace: `SocialOrchestrator.Api.Controllers`
- File: `Controllers/HealthController.cs`
- Endpoint: `GET /api/health`
  - Returns 200 OK with body: `{ "status": "ok" }`

> FOR CODING AGENTS: Do not add other controllers in this phase.

---

## 4. Database Setup (Skeleton Only)

### 4.1 Connection String Configuration

In `SocialOrchestrator.Api`:

- Add `appsettings.json` with minimum content:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SQL_SERVER;Database=SocialOrchestrator;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

For now, treat `YOUR_SQL_SERVER` as a placeholder to be replaced manually on each environment.

### 4.2 Configure EF Core Provider

In `SocialOrchestrator.Infrastructure.DependencyInjection`:

- Implement `AddInfrastructure` to register `AppDbContext`:

  - Use `services.AddDbContext<AppDbContext>(options => options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));`

- Add reference to `Microsoft.EntityFrameworkCore.SqlServer` in `SocialOrchestrator.Infrastructure.csproj`.

> No migrations or tables are required in Phase 0, but you can add an initial migration without any entities if you want to verify configuration.

---

## 5. Frontend Setup (Angular)

### 5.1 Create Angular Workspace

Under `src/Client`:

- Create Angular project:
  - Workspace + application name: `social-orchestrator-web`
  - Routing: enabled
  - Style: SCSS (recommended, but you can choose CSS/SASS; once chosen, stick to it consistently)

Resulting structure (simplified):

```text
src/Client/social-orchestrator-web/
  src/
    app/
      app-routing.module.ts
      app.component.*
      app.module.ts
```

### 5.2 Base App Layout

Modify base app to show a simple layout:

- `app.component.html`:
  - Simple header with app name: “SocialOrchestrator”.
  - `<router-outlet>` for routing.

Example (not exact layout, but concept):

```html
<header>
  <h1>SocialOrchestrator</h1>
</header>
<main>
  <router-outlet></router-outlet>
</main>
```

### 5.3 Environment Configuration

- Use Angular environments (`environment.ts`, `environment.prod.ts`).
- Add `apiBaseUrl` property:

```ts
export const environment = {
  production: false,
  apiBaseUrl: 'https://localhost:5001/api'
};
```

- In `environment.prod.ts`, keep `apiBaseUrl` as placeholder; adjust after deployment.

---

## 6. Cross-Cutting Concerns (Minimal)

### 6.1 Logging

In Phase 0:

- Use default ASP.NET Core logging (Console).
- No need for Serilog or external log sinks yet.

### 6.2 Error Handling

In `SocialOrchestrator.Api`:

- Add a global exception handler middleware **later** (Phase 1 or 2).  
- For now, rely on default developer exception page in Development.

### 6.3 CORS

- Configure CORS policy in Program.cs:
  - Allow `https://localhost:4200` (Angular dev server).
  - Limit methods to GET/POST/PUT/DELETE for now.

---

## 7. Manual Verification Checklist

After implementing Phase 0, verify:

1. Backend builds:
   - `dotnet build` in `src/Server/SocialOrchestrator.sln` passes.

2. Backend runs:
   - `dotnet run` from `SocialOrchestrator.Api` starts web server.
   - `GET https://localhost:5001/api/health` returns `{ "status": "ok" }`.

3. Frontend builds:
   - `npm install` and `ng serve` in `src/Client/social-orchestrator-web` works.
   - Application shows “SocialOrchestrator” header.

4. Frontend → Backend connectivity:
   - (Optional in Phase 0) Add a simple Angular service that calls `/api/health` and logs the result.

---

## 8. Instructions for Automated Coding Agents

When using this document:

1. **Do not create business entities or features** (Users, Workspaces, Posts, etc.) in this phase.
2. Follow directory structures and file names **exactly** as specified.
3. When a placeholder or TODO is mentioned, add a `// TODO:` comment instead of making up behavior or configuration.
4. Do not introduce external dependencies (Redis, message queues, cloud SDKs) in this phase.
5. After completing this phase, stop and wait for explicit instruction to proceed to the next phase document (Phase 1).

This completes the specification for **Phase 0 – Project Setup and Architecture Foundation**.