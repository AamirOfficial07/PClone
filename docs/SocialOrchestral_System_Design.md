# SocialOrchestrator – System Design Document  
*A “better Publer” social media management platform – optimized for a solo developer and single-server deployment*

**Document Version:** 0.2 (Draft)  
**Date:** YYYY-MM-DD  
**Author:** –  

---

## 0. Context & Constraints

This design is tailored specifically for:

- **You working solo** (no big team, no DevOps department).
- **Local development** in VS Code or Visual Studio.
- **Deployment to a single hosting server** (VPS / Windows host / Linux + reverse proxy).
- **No hard dependency** on cloud-specific components (Azure Service Bus, Redis, etc.) for the first phase.

Design principles:

- **Keep it simple to build and run on your machine.**
- **Use a modular monolith** (one backend process, one database).
- **Use database-backed background jobs** (Hangfire or similar) instead of external queues.
- **Design for future scaling**, but don’t implement complex infrastructure until needed.

---

## 1. Introduction

### 1.1 Purpose

This document describes the system design for **SocialOrchestrator**, a social media management platform intended to be a more powerful and extensible alternative to Publer, while being realistic for a single developer to implement and run.

It covers:

- Product goals and scope  
- Functional and non-functional requirements  
- High-level system architecture (single-server friendly)  
- Logical modules and data model  
- Integration with social networks  
- Development setup and project structure  
- Deployment approach for a typical hosting server  
- Implementation roadmap  

### 1.2 Scope

SocialOrchestrator will provide:

- Social account management across all targeted networks  
- Drafting, scheduling, and publishing of social content (including advanced formats like reels, stories, carousels, etc.)  
- Media library and asset management with local storage (cloud-ready)  
- Team collaboration and approval workflows  
- Analytics and insights (posts, accounts, hashtags, members, experiments, competitors)  
- Rule-based automation and external integrations  
- AI-assisted content and analytics  
- A public REST API and webhooks for integrations  
- Billing, plans, and enterprise features (SSO, whitelabel, multi-region ready)

### 1.3 Vision and Differentiation

Compared to Publer, SocialOrchestrator aims to:

- Provide a **clean modular architecture** that is easy to work on solo.
- Offer a built-in **rule-based automation engine**.
- Integrate **AI-assisted content and scheduling** once core is stable.
- Remain **simple to deploy** (single server, single SQL Server DB), with the option to scale up later.

---

## 2. Product Overview

### 2.1 Target Users

- Marketing teams and agencies  
- Solo creators and small businesses  
- Enterprises (later, once the platform matures)  
- Developers integrating social workflows via API (later phase)

### 2.2 Supported Networks (Initial & Extensible)

Target networks to support (covered across Phases 2, 8 and beyond):

- Facebook
- Instagram
- X (Twitter)
- LinkedIn
- Pinterest
- YouTube
- TikTok
- Google Business Profile
- WordPress
- Telegram
- Mastodon
- Threads
- Bluesky

The design supports adding providers as **plugins** to a common interface (one provider per network type, all conforming to the same abstractions). Initial implementation can prioritize a subset (e.g., Facebook/Instagram/X/LinkedIn) as long as the code structure allows adding the rest without refactoring core logic.

---

## 3. Requirements

### 3.1 Functional Requirements (Prioritized for Solo Dev)

#### 3.1.1 User & Workspace Management

- User registration, login, logout, password reset.
- Workspaces (organizations/brands).
- A user can belong to multiple workspaces.
- Invite users to a workspace via email.
- Role-based access within a workspace:
  - Owner, Admin, Editor, Viewer (Client roles can be added later).
- Workspace settings:
  - Time zone, first day of week.
  - Branding (name, logo).
  - Default time slots for posting.

#### 3.1.2 Social Account Management

- Connect social accounts via OAuth for each provider.
- Store access/refresh tokens securely (encrypted in DB).
- Automatic token refresh where supported.
- Handle:
  - Revoked tokens.
  - Missing permissions.
  - Re-authorization flows.
- Disable/delete connected accounts (without breaking history).

#### 3.1.3 Post Creation & Management

- Rich post editor:
  - Text, emojis, hashtags, links.
  - Attach images, GIFs, videos, documents.
  - Per-network customization (e.g., shorter text for Twitter).
- Draft management:
  - Create, edit, duplicate drafts.
  - Save as templates.
- Bulk:
  - Bulk post creation via API and, later, via CSV/Excel import.
- Supported content types (implemented across Phases 3 and 8):
  - Status (text-only).
  - Link.
  - Photo.
  - Video.
  - Reel.
  - Story.
  - Short.
  - Poll.
  - Document.
  - Carousel.
  - Article.

#### 3.1.4 Scheduling & Publishing

- Schedule posts at specific date/time (per account).
- Time zone-aware scheduling (workspace time zone).
- Queue-based scheduling:
  - Define weekly time slots per account.
  - Add posts to queues instead of specifying exact time; system picks next available slot.
- Recurring posts:
  - Support daily/weekly/monthly recurrence with start/end dates.
- Evergreen/recycling content:
  - Requeue a post after a configurable interval, with optional max repeats.
- Publishing reliability:
  - Background worker executes publish jobs.
  - Retries with exponential backoff.
  - Clear error logging and user-facing status (failed + reason).

#### 3.1.5 Calendar & Dashboard

- Calendar view:
  - Month/week/day view of scheduled & published posts.
- Filters:
  - Workspace, social account, state (draft/scheduled/published/failed), post type, tags.
- Drag-and-drop rescheduling:
  - Drag posts to new dates/times to change schedules.
- Queue view:
  - Visualize queue slots and posts assigned to queues per account.
- Dashboard:
  - Upcoming posts and overdue posts.
  - Recent published posts with high-level stats.

#### 3.1.6 Collaboration & Approval

- Approvals:
  - Assign post creator and one or more approvers.
  - Approval workflow on posts:
    - Draft → PendingApproval → Approved/Rejected.
- Comments on posts and variants:
  - Threaded comment list with replies.
  - Optional @mentions of team members.
- Activity log / audit:
  - Show key actions (created, edited, scheduled, approved, published, failed, comments).
- Notifications:
  - In-app and email notifications for approvals, rejections, comments, failures, etc.

#### 3.1.7 Media Library

- Upload images and videos from browser to server.
- Store files under a dedicated folder on the server (e.g., `/var/www/socialorchestrator/media` or `D:\socialorchestrator\media`).
- Metadata in DB:
  - Filename, path, type, size, workspace, uploader, created date.
- Organization:
  - Tags and simple folder hierarchy.
- Search by name, tag, type.

(NOTE: Cloud storage support is optional/future. The storage layer will be abstracted to allow local file system and, later, S3/Azure Blob etc.)

#### 3.1.8 Automation & Integrations

- Full rule engine (IF/THEN) with:
  - Triggers: time-based, RSS new items, analytics thresholds, webhooks.
  - Conditions: text/hashtags, accounts, post types, performance metrics, labels.
  - Actions: create drafts, schedule posts, move to queues, send webhooks/emails, add labels, etc.
- RSS feed ingestion:
  - Periodically fetch RSS/Atom feeds and create draft posts via rules.
- Webhooks:
  - Outbound webhooks for key events (post created/published/failed, automation runs, media uploads, etc.).
- Third-party integrations:
  - API and webhook design compatible with Zapier/Make and similar tools.

#### 3.1.9 Analytics & Insights

- Per-post metrics where the social platforms allow:
  - Impressions/reach, likes, comments, shares, clicks.
- Per-account stats:
  - Followers count over time (daily snapshots).
  - Posts per day.
  - Engagement rate.
- Workspace-level analytics:
  - Totals and trends over time.
  - Content-type mix (status vs link vs video, etc.).
- “Best times to post”:
  - Deterministic heatmap (Phase 5).
  - AI-assisted recommendations (Phase 7/14).
- Deep analytics:
  - Hashtag analytics (group posts by hashtags, metrics per hashtag).
  - Member analytics (performance by creator).
  - Experiment/A/B test analytics.
  - Competitor analytics and comparisons.

#### 3.1.10 Public REST API

- Internal REST API for the SPA and admin functionality.
- Versioned public REST API (e.g., `/api/public/v1`) with:
  - API keys and scopes per workspace.
  - Endpoints for workspaces, accounts, posts, media, analytics, automation, and webhooks.
- Swagger/OpenAPI documentation for public and internal APIs.

#### 3.1.11 Billing & Plans

- Plans:
  - Free, Pro, Business, Enterprise (configurable).
- Stripe-backed subscriptions:
  - Per-workspace subscriptions, trials, upgrades/downgrades.
- Plan limits:
  - Limits on social accounts, scheduled posts per period, automation rules, API usage, etc.
- Usage tracking and enforcement:
  - Usage metrics and limit checks in core flows (creating accounts, scheduling posts, etc.).

#### 3.1.12 Enterprise Features

- SSO:
  - OIDC-based SSO providers per workspace or organization.
- Whitelabel:
  - Custom domains, branding (logo, colors) per workspace.
- Multi-region readiness:
  - Region-aware config and job execution; primary region concept for background jobs.

---

### 3.2 Non-Functional Requirements (Simplified for Solo Dev)

- Single primary deployment target: **one server** running:
  - ASP.NET Core Web API.
  - Angular SPA (served from same process or via static hosting).
  - SQL Server (either on same machine or network accessible).
- Maintainable by a single developer.
- Performance:
  - Efficient DB queries and pagination for tens/hundreds of thousands of posts.
- Reliability:
  - Publishing jobs must not be lost; use DB-backed job queue.
- Security:
  - Solid authentication/authorization.
  - Token and secret encryption.
- Extensibility:
  - Clear module boundaries so new features don’t become a mess.

---

## 4. Architecture

### 4.1 High-Level Architecture (Single-Server)

Components:

- **Frontend:** Angular SPA.
- **Backend:** ASP.NET Core Web API (single executable).
- **Database:** SQL Server (all core data + Hangfire tables for jobs).
- **File Storage:** Local file system for media (configurable path).
- **Background Jobs:** Hangfire or custom hosted services (using SQL as job store).

No external message bus, no Redis, no cloud-specific services are required.

### 4.2 Logical Architecture Diagram

```text
+----------------------+
|   Angular Frontend   |
|   (SPA)              |
+----------+-----------+
           |
           | HTTPS (REST + JSON)
           v
+-------------------------------+
| ASP.NET Core Web API          |
|  - Auth & Users               |
|  - Workspaces & Teams         |
|  - Social Accounts            |
|  - Posts & Scheduling         |
|  - Media                      |
|  - Analytics (read)           |
|  - Automation (simple)        |
|  - Admin/Settings             |
+---------------+---------------+
                |
                +------------------------------+
                |                              |
                v                              v
        +---------------+             +-----------------+
        | SQL Server    |             | File System     |
        | - Domain data |             | - Media files   |
        | - Auth tokens |             +-----------------+
        | - Hangfire    |
        +-------+-------+
                ^
                |
        Background Jobs (same process)
        - Scheduler
        - Publisher
        - Analytics polling
        - RSS/Automation
```

### 4.3 Architectural Style

- **Modular monolith**: one codebase, one process, clear internal modules.
- Layers:
  - **Domain**: entities, value objects, domain rules.
  - **Application**: use cases/services, input/output DTOs.
  - **Infrastructure**: EF Core, file storage, social network clients.
  - **Presentation**: Web API controllers.

---

## 5. Logical Modules and Responsibilities

Modules are logical; they can be separate C# class libraries in the solution.

### 5.1 Identity & Access

Responsibilities:

- User accounts, login, logout, password reset.
- JWT generation/validation.
- Role-based authorization within workspaces.
- Optional API keys for public API.

Technology:

- ASP.NET Identity (SQL Server store).
- JWT auth middleware.

---

### 5.2 Workspace & Team Management

Responsibilities:

- Create/edit workspaces.
- Invite users by email and assign roles.
- Workspace-level settings (time zone, branding, limits).

Entities:

- `Workspace`, `WorkspaceMember`, `WorkspaceSettings`.

---

### 5.3 Social Connectors

Responsibilities:

- OAuth flows for each social network.
- Store and refresh tokens securely.
- Publishing and deletion of posts.
- Fetch per-post and per-account metrics.

Design:

- `ISocialPublisher` interface with implementations:
  - `FacebookPublisher`, `InstagramPublisher`, `TwitterPublisher`, `LinkedInPublisher`, etc.
- A factory or registry that maps network type → publisher implementation.

---

### 5.4 Posts & Scheduling

Responsibilities:

- CRUD for posts and per-account variants.
- Scheduling logic for single-run posts (v1).
- Integration with Hangfire/jobs:
  - Enqueue a publish job for each PostVariant at scheduled time.

Entities:

- `Post` (logical content).
- `PostVariant` (content for a specific social account).
- `Schedule` (for each variant).
- `PublishExecution` (optional: tracks job runs).

Workflow:

1. User creates a Post with one or more PostVariants.
2. User schedules each variant:
   - Set `ScheduledAt` (in workspace time zone).
3. When saving:
   - Create a job in Hangfire scheduled for `ScheduledAt` in UTC.
4. Background worker:
   - Executes job → calls `ISocialPublisher.PublishAsync` → updates state.

---

### 5.5 Media Management

Responsibilities:

- Upload and store media on local file system.
- Track metadata in DB.
- Serve files via ASP.NET Core (protected URLs if necessary).

Entities:

- `MediaAsset` (ID, path, workspace, type, etc.).
- `MediaUsage` (link between PostVariant and MediaAsset).

Design:

- `IMediaStorage` interface:
  - `SaveAsync(Stream stream, string fileName) → path`
  - `DeleteAsync(path)`
  - Implementation: `LocalFileSystemMediaStorage` (root path in config).

---

### 5.6 Analytics & Reporting (Initial)

Responsibilities:

- Poll provider APIs periodically to update metrics.
- Store daily snapshots for:
  - Posts.
  - Accounts.
- Provide simple analytics endpoints.

Approach:

- Background job scheduled every X minutes/hours:
  - Fetch metrics for recent posts.
  - Update `PostAnalyticsDaily` and `AccountAnalyticsDaily` tables.

---

### 5.7 Automation (Initial)

Responsibilities:

- RSS feed ingestion:
  - Periodically read configured feeds.
  - Create draft posts for new items.
- Simple time-based tasks:
  - Cleanup old failed jobs/logs.
  - Send daily summary emails (later).

Approach:

- Hangfire recurring jobs (`Cron.Hourly`, `Cron.Daily`, etc.).
- Simple configuration in DB and admin UI.

---

## 6. Data Model (High-Level)

Key tables (simplified):

- `Users`  
- `Workspaces`  
- `WorkspaceMembers`  

- `SocialAccounts` (workspace, network type, external IDs, token FK)  
- `SocialAuthTokens` (encrypted tokens, expiry)  

- `Posts` (workspace, state, creator, created/updated timestamps)  
- `PostVariants` (per social account, text, media, scheduled/published, state, externalPostId)  
- `Schedules` (variant, scheduled time, timezone) or store schedule fields on `PostVariants` directly for v1.  

- `MediaAssets` (workspace, path, type)  
- `MediaUsages` (PostVariant↔MediaAsset)  

- `PostAnalyticsDaily` (variant, date, metrics)  
- `AccountAnalyticsDaily` (social account, date, metrics)  

- Hangfire tables (`Hangfire.*`) for jobs.

For early implementation, you can:

- Put schedule columns (`ScheduledAt`, `TimeZone`, `IsRecurring` flag, `RecurrenceRule` nullable) directly on `PostVariants`.
- Add separate `Schedules` table later if recurrence becomes complex.

---

## 7. Development Setup & Project Structure

### 7.1 Backend Project Structure (C# / .NET)

Recommended solution layout:

```text
src/
  Server/
    SocialOrchestrator.Api/           # ASP.NET Core Web API (controllers, startup)
    SocialOrchestrator.Application/   # Use cases, DTOs, application services
    SocialOrchestrator.Domain/        # Entities, value objects, domain logic
    SocialOrchestrator.Infrastructure/# EF Core, social clients, media storage, auth, Hangfire
  Client/
    social-orchestrator-web/          # Angular app
tests/
  SocialOrchestrator.UnitTests/
  SocialOrchestrator.IntegrationTests/
```

Key points:

- `Domain` has no dependencies on other projects.
- `Application` depends only on `Domain`.
- `Infrastructure` depends on both `Domain` and `Application`.
- `Api` depends on `Application` and `Infrastructure`.

### 7.2 Frontend Project Structure (Angular)

Basic Angular workspace:

```text
client/social-orchestrator-web/
  src/
    app/
      core/            # services, interceptors, auth
      shared/          # shared components, models
      features/
        auth/
        workspaces/
        social-accounts/
        posts/
        calendar/
        media/
        analytics/
        settings/
      app-routing.module.ts
      app.component.*
```

---

### 7.3 Local Development Environment

Requirements:

- .NET 8 SDK.
- Node.js + npm.
- Angular CLI.
- SQL Server (LocalDB, SQL Express, or Docker SQL Server).
- IDE: VS Code or Visual Studio (your choice).

Typical dev flow:

1. `cd src/Server/SocialOrchestrator.Api`
2. `dotnet ef database update` (to create DB).
3. `dotnet run` (API on https://localhost:5001).
4. `cd src/Client/social-orchestrator-web`
5. `npm install`
6. `ng serve` (Angular on http://localhost:4200).

---

## 8. Deployment Architecture (Single Hosting Server)

### 8.1 Assumptions

- You have one hosting server (Linux or Windows).
- You can host:
  - A .NET application.
  - A SQL Server instance (or use a remote SQL Server).
  - Angular built files as static content.

### 8.2 Deployment Options

**Option A: ASP.NET Core serves Angular**

- Build Angular (`ng build --prod`).
- Copy `dist/` into `SocialOrchestrator.Api/wwwroot`.
- Configure API to serve SPA (UseSpa / static files).
- Deploy a single .NET app (Kestrel + IIS/NGINX reverse proxy).

**Option B: Separate Frontend Hosting**

- Host Angular build on your web server (e.g., NGINX / IIS / static hosting).
- Configure it to call the API at `/api` on the same domain (CORS friendly).

### 8.3 Background Jobs in Production

- Use Hangfire with SQL Server:
  - It runs in the same process as the API.
  - Same deployment, simpler to manage.
- Protect the Hangfire dashboard (if you enable it) with admin auth.

---

## 9. Security (Solo-Friendly but Solid)

- Use HTTPS everywhere (configure SSL on your hosting server).
- Use ASP.NET Identity for users; store passwords hashed (default).
- Use JWT for frontend auth.
- Encrypt social tokens in DB (e.g., using Data Protection APIs or a custom encryption key).
- Role-based authorization attributes on controllers/actions.
- Validate all external inputs (webhooks, RSS, etc.).

For now, you do not need:

- OpenTelemetry, distributed tracing, or complex SIEM integrations.
- External secrets manager; you can start with user secrets + environment variables.

---

## 10. Implementation Roadmap (Solo Dev)

### Phase 0 – Setup & Skeleton

- Create solution and projects (Domain, Application, Infrastructure, Api).
- Set up EF Core + SQL Server.
- Add ASP.NET Identity (basic user auth).
- Scaffold Angular app with basic layout.

### Phase 1 – Core Posting

- Workspaces, social accounts (connect one network first, e.g., Facebook).
- Post creation (text, photo, link) and manual scheduling.
- Hangfire-based job for publishing to that one network.
- Calendar view showing scheduled and published posts.
- Simple logs for publish failures.

### Phase 2 – Multi-Network & Media

- Add more providers (Instagram, Twitter/X, LinkedIn).
- Expand post types (video).
- Media library (local file storage, tagging, search).
- Per-network customization in post editor.

### Phase 3 – Analytics & Basic Automation

- Poll metrics for posts and accounts.
- Simple analytics views.
- RSS ingestion → auto-draft.
- Basic outbound webhooks.

### Phase 4 – Polish & Public API

- Improve UI/UX.
- Add approval workflow.
- Add public REST API with API keys.
- Optional: Stripe integration for billing.

---

This version of the document is expanded with more concrete implementation details and simplified infrastructure so you can realistically build and run this solo on your local machine and a single hosting server.