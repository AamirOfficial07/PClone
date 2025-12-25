# SocialOrchestrator – System Design Document  
*A “better Publer” social media management platform*

**Document Version:** 0.1 (Draft)  
**Date:** YYYY-MM-DD  
**Author:** –  

**Proposed Tech Stack**

- **Backend:** ASP.NET Core Web API (.NET 8+)
- **Frontend:** Angular
- **Primary Database:** SQL Server
- **Infrastructure (recommended):** Azure (App Service, SQL, Service Bus, Blob Storage, Redis)

---

## 1. Introduction

### 1.1 Purpose

This document describes the system design for **SocialOrchestrator**, a multi-tenant social media management platform intended to be a more powerful and extensible alternative to Publer.

It covers:

- Product goals and scope  
- Functional and non-functional requirements  
- High-level system architecture  
- Logical modules and data model  
- Integration with social networks  
- Security, scalability, and deployment considerations  
- Proposed implementation roadmap  

### 1.2 Scope

SocialOrchestrator will provide:

- Social account management across major networks  
- Drafting, scheduling, and publishing of social content  
- Media library and asset management  
- Team collaboration and approval workflows  
- Analytics and insights (posts, accounts, hashtags, members, competitors)  
- Rule-based automation and external integrations  
- A public REST API

### 1.3 Vision and Differentiation

Compared to Publer, SocialOrchestrator aims to:

- Provide a cleaner modular architecture that is easier to extend  
- Offer a powerful **rule-based automation engine**  
- Integrate **AI-assisted content and scheduling** from day one  
- Be multi-tenant and enterprise-ready, with clear boundaries for scaling and possible microservices in the future  

---

## 2. Product Overview

### 2.1 Target Users

- Marketing teams and agencies  
- Solo creators and small businesses  
- Enterprises managing multiple brands and regions  
- Developers integrating social workflows into their own apps (via API)

### 2.2 Supported Networks (Initial & Extensible)

Initial networks (prioritized):

- Facebook
- Instagram
- X (Twitter)
- LinkedIn

Additional networks (planned):

- Pinterest
- YouTube
- TikTok
- Google Business Profile
- WordPress
- Telegram
- Mastodon
- Threads
- Bluesky

The design supports adding more providers via a pluggable connector model.

---

## 3. Requirements

### 3.1 Functional Requirements

#### 3.1.1 User & Workspace Management

- User registration, login, logout, password reset
- Workspaces (organizations/brands)  
- A user can belong to multiple workspaces
- Invite users to a workspace via email
- Role-based access within a workspace:
  - Owner, Admin, Editor, Viewer, Client (configurable roles)
- Workspace-level settings:
  - Time zone  
  - First day of week  
  - Branding (logo, colors)  
  - Default posting times  

#### 3.1.2 Social Account Management

- Connect social accounts via OAuth for each provider
- Store access/refresh tokens securely and refresh automatically when possible
- Display connected accounts and their status
- Handle:
  - Permission loss (missing scopes)  
  - Token expiration  
  - Re-authorization flows  
- Support disabling and deleting connected accounts safely (without breaking history)

#### 3.1.3 Post Creation & Management

- Rich post editor:
  - Text, emojis, hashtags, links  
  - Attach images, GIFs, videos, documents, carousels  
  - Network-specific customizations (caption text limits, link preview options, tags/mentions)  
- Draft management:
  - Create, edit, duplicate drafts  
  - Save as templates  
- Bulk operations:
  - Bulk post creation via CSV/Excel or API  
- Content types (similar to Publer):
  - Status (text-only)  
  - Link  
  - Photo  
  - GIF  
  - Video  
  - Reel  
  - Story  
  - Short  
  - Poll  
  - Document  
  - Carousel  
  - Article  

#### 3.1.4 Scheduling & Publishing

- Single-time scheduling (specific date/time)  
- Queue-based scheduling:
  - Per-account time slots (e.g. Mon/Wed/Fri at 9:00)  
- Recurring schedules:
  - RRULE-style (every N days/weeks/months, by weekday, etc.)  
- Recycling/evergreen content:
  - Reposting with configurable intervals and end conditions  
- Publishing behavior:
  - Reliable background workers  
  - Exponential backoff retries  
  - Platform constraints enforced (e.g., text length, aspect ratios, video duration)  
- Time zone aware:
  - Scheduling according to workspace time zone  

#### 3.1.5 Calendar & Dashboard

- Calendar views:
  - Monthly, weekly, daily  
- Filters:
  - Workspace, social account, member, post state, content type, tags/labels  
- Drag-and-drop rescheduling in calendar view  
- Kanban-style board:
  - Draft → Pending approval → Scheduled → Published → Failed  

#### 3.1.6 Collaboration & Approval

- Approval workflows:
  - Request approval for a post  
  - Approve or decline with reason  
- Comments and discussions on posts  
- Activity log:
  - Track who created/edited/approved/scheduled posts and when  

#### 3.1.7 Media Library

- Upload media:
  - Images, GIFs, videos, documents  
- Store in cloud blob storage  
- Organize:
  - Folders, tags, favorites  
- Search by name, tag, type, uploader, date  
- Basic editing (optional initial feature):
  - Crop, resize, add watermark  
- Reuse assets across multiple posts and workspaces (with permissions)

#### 3.1.8 Automation & Integrations

- Integrations:
  - RSS/Atom feeds → auto-generate draft posts  
  - Webhooks (inbound/outbound)  
  - Connectors (e.g. CMS, Zapier/Make, etc.)  
- Rule-based automation engine:
  - Triggers:
    - New content (e.g. an RSS item)  
    - Time-based triggers (cron-like)  
    - Metrics thresholds (e.g. posts with &gt;X clicks)  
    - Webhook events  
  - Conditions:
    - Text contains / doesn’t contain words/hashtags  
    - Accounts, content types, labels, performance metrics  
  - Actions:
    - Create draft  
    - Schedule post or move to queue  
    - Add labels/tags  
    - Send email or webhook  
    - Notify team members  

#### 3.1.9 Analytics & Insights

- Per-post metrics:
  - Impressions, reach, clicks, reactions, reactions by type, comments, shares, saves, CTR  
- Account and workspace analytics:
  - Follower growth, engagement rate over time  
  - Posting frequency and content mix  
- Hashtag analytics:
  - Performance per hashtag (reach, engagement, CTR)  
  - Top-performing posts per hashtag  
- Best times to post:
  - Day/hour heatmaps based on historical data  
- Member analytics:
  - Performance by creator/member (posts created, average engagement)  
- Competitor analytics:
  - Track competitor accounts  
  - Compare follower counts, engagement rate, posting mix and frequency  
- Reporting:
  - Download as CSV/PDF  
  - Schedule reports via email  

#### 3.1.10 Public REST API

- Base URL: `/api/v1`  
- JSON-based requests and responses  
- Authentication:
  - API keys (Bearer-API style) scoped to workspace and permissions  
- Example endpoints:
  - `GET /api/v1/me`  
  - `GET /api/v1/workspaces`  
  - `GET/POST /api/v1/accounts`  
  - `GET/POST /api/v1/posts`  
  - `GET /api/v1/posts/{id}`  
  - `GET /api/v1/analytics/posts`  
- Async operations:
  - Bulk post creation, heavy analytics/report generation:
    - Return `{ "job_id": "..." }`  
    - Job status endpoint `GET /api/v1/jobs/{job_id}`  

#### 3.1.11 Billing & Plans

- Plan tiers (configurable):
  - Free, Pro, Business, Enterprise  
- Constraints per plan:
  - Number of workspaces, social accounts, scheduled posts  
  - Number of automation rules  
  - API access level  
  - Analytics depth  
- Stripe integration:
  - Subscription billing and invoices  
  - Trials, upgrades/downgrades, proration  
- Usage tracking:
  - Posts created, API requests, automation rule executions  

### 3.2 Non-Functional Requirements

- Multi-tenant SaaS: single codebase, multiple workspaces  
- Availability target: 99.9%+  
- Horizontal scalability:
  - API layer and background workers can scale independently  
- Performance:
  - Fast UI response (&lt; 300ms typical API latency for common operations)  
  - Efficient pagination for large datasets (posts, media, analytics)  
- Security:
  - Strong auth and authorization  
  - Secure storage of tokens and secrets  
  - Audit trails for critical actions  
- Observability:
  - Centralized logs  
  - Metrics for performance and business KPIs  
  - Distributed tracing for complex workflows  
- Extensibility:
  - Clear module boundaries and internal APIs  

---

## 4. High-Level Architecture

### 4.1 Architectural Overview

Components:

- **Frontend:** Angular SPA served over HTTPS  
- **API:** ASP.NET Core Web API as the primary gateway  
- **Background Services:** .NET worker processes for:
  - Scheduler
  - Publisher
  - Analytics ingestion and aggregation
  - Automation rule execution
- **Database:** SQL Server for transactional data  
- **Cache:** Redis for caching and rate limiting  
- **Storage:** Blob storage for media files  
- **Message Bus:** Azure Service Bus or RabbitMQ for asynchronous jobs  

### 4.2 Logical Architecture Diagram (Conceptual)

```text
      +------------------+            +------------------+
      |  Angular Frontend|  HTTPS     |  Third-party     |
      |  (SPA)           +----------->+  Integrations    |
      +--------+---------+            +------------------+
               |
               v
      +------------------------------+
      |  ASP.NET Core Web API        |
      |  - Auth, Workspaces          |
      |  - Posts, Scheduling         |
      |  - Media, Analytics (read)   |
      |  - Automation, Billing       |
      +-------+-----------+----------+
              |           |
              |           v
              |   +------------------+
              |   | Public API       |
              |   | (API Keys)       |
              |   +------------------+
              |
      +-------+-------------------------------+
      |           Domain Services             |
      |  - Identity & Access                  |
      |  - Workspace & Team Management        |
      |  - Social Connectors                  |
      |  - Post & Scheduling                  |
      |  - Media Management                   |
      |  - Analytics & Reporting              |
      |  - Automation & Rules                 |
      |  - Billing & Subscription             |
      +-------+-----------+-------------------+
              |           |
              v           v
       +----------+   +--------+   +-----------------+
       | SQL       |  | Redis  |   | Message Bus     |
       | Server    |  | Cache  |   | (Queue / Topic) |
       +-----------+  +--------+   +-----------------+
              |
              v
       +---------------------------+
       | Blob Storage (Media)     |
       +---------------------------+

Background Workers:
- Scheduler: reads SQL, enqueues jobs
- Publisher: reads queue, calls social APIs
- Analytics: periodically fetches metrics
- Automation: executes rules based on events
```

### 4.3 Architectural Style

- **Modular Monolith** for early versions:
  - Clear folder/assembly structure by domain  
- **Domain-driven design** concepts:
  - Entities, value objects, domain services per bounded context  
- **Service boundaries**:
  - Identity & Access  
  - Workspaces & Teams  
  - Social Connectors  
  - Posts & Scheduling  
  - Media  
  - Analytics  
  - Automation  
  - Billing  

The design anticipates potential future split into microservices by keeping domain modules isolated and using messaging for cross-module workflows.

---

## 5. Logical Modules and Responsibilities

### 5.1 Identity & Access

**Responsibilities:**

- User management (registration, login, password reset)
- JWT issuance and validation
- Role- and permission-based authorization
- API key management (for public API)

**Core Entities:**

- `User`
- `Role`
- `Permission`
- `ApiKey`

---

### 5.2 Workspace & Team Management

**Responsibilities:**

- Create and manage workspaces
- Invite members and assign roles
- Maintain workspace-specific settings
- Associate workspaces with plans/subscriptions

**Core Entities:**

- `Workspace`
- `WorkspaceMember`
- `WorkspaceRole`
- `WorkspaceSettings`

---

### 5.3 Social Connector Service

**Responsibilities:**

- Integrate with social network APIs (OAuth flows, publishing, analytics)
- Abstract provider differences under a unified interface
- Manage tokens and scopes
- Handle provider-specific errors and rate limits

**Core Entities:**

- `SocialAccount`
- `SocialAuthToken`
- `SocialProviderConfig`

**Key Interface (example):**

```csharp
public interface ISocialPublisher
{
    Task&lt;PublishResult&gt; PublishAsync(PostVariant variant, SocialAccount account, MediaAsset[] media);
    Task&lt;DeleteResult&gt; DeleteAsync(PostVariant variant, SocialAccount account);
    Task&lt;AnalyticsResult&gt; FetchAnalyticsAsync(PostVariant variant, SocialAccount account, DateTime from, DateTime to);
}
```

Provider-specific implementations (e.g., `FacebookPublisher`, `InstagramPublisher`, etc.) implement this interface.

---

### 5.4 Post & Scheduling Service

**Responsibilities:**

- Manage posts, drafts, and per-account variants
- Manage schedules (single, recurring, queue-based, recycling)
- Provide data for calendar and board views
- Interface with Scheduler and Publisher workers

**Core Entities:**

- `Post` – conceptual post content
- `PostVariant` – per social account/network instance
- `Schedule` – when/how a post will be published
- `QueueSlot` – queue-based time slots per account
- `PublishJob` – record of each publishing attempt

---

### 5.5 Media Management Service

**Responsibilities:**

- Upload and store media in blob storage
- Maintain metadata and associations to posts
- Generate thumbnails and previews
- Manage folders, tags, and search

**Core Entities:**

- `MediaAsset`
- `MediaFolder`
- `MediaUsage` (join between `PostVariant` and `MediaAsset`)

---

### 5.6 Analytics & Reporting Service

**Responsibilities:**

- Fetch metrics from social APIs  
- Store raw metrics and maintain aggregated views  
- Provide analytics APIs for posts, accounts, workspaces, hashtags, members, competitors  
- Compute “best times to post” and other derived insights  
- Generate downloadable and scheduled reports  

**Core Entities:**

- `Metric` (raw)
- `PostAnalyticsDaily`
- `AccountAnalyticsDaily`
- `WorkspaceAnalyticsDaily`
- `Hashtag` / `HashtagAnalyticsDaily`
- `Competitor` / `CompetitorMetricsDaily`
- `Report`

---

### 5.7 Automation & Rules Engine

**Responsibilities:**

- Allow users to define automation rules with triggers, conditions, and actions  
- Execute rules in background workers  
- Provide audit/history of rule runs  

**Core Entities:**

- `AutomationRule`
- `AutomationTrigger`
- `AutomationCondition`
- `AutomationAction`
- `AutomationRun`

---

### 5.8 Notification Service

**Responsibilities:**

- Send email and in-app notifications:
  - Post approvals, failures, comments, limit warnings, etc.  
- Provide basic communication channels (email, webhooks, possibly Slack/Teams in future)

---

### 5.9 Billing & Subscription Service

**Responsibilities:**

- Integrate with Stripe:
  - Plans, subscriptions, invoices, customer profiles  
- Track usage against plan limits  
- Enforce feature and usage limits  
- Provide subscription management UI/flows  

**Core Entities:**

- `Plan`
- `Subscription`
- `Invoice`
- `UsageLog`

---

## 6. Data Model (High-Level)

### 6.1 Key Tables (Simplified)

**Identity & Workspace**

- `Users`
  - `UserId`, `Email`, `PasswordHash`, `Status`, `CreatedAt`, `LastLoginAt`, …

- `Workspaces`
  - `WorkspaceId`, `Name`, `TimeZone`, `PlanId`, `OwnerUserId`, `CreatedAt`, …

- `WorkspaceMembers`
  - `WorkspaceId`, `UserId`, `Role`, `InvitedByUserId`, `JoinedAt`, …

- `ApiKeys`
  - `ApiKeyId`, `WorkspaceId`, `TokenHash`, `Scopes`, `CreatedAt`, `LastUsedAt`, `Status`

**Social Connections**

- `SocialAccounts`
  - `SocialAccountId`, `WorkspaceId`, `NetworkType`, `ExternalId`, `Name`, `Username`, `Status`, `CreatedAt`

- `SocialAuthTokens`
  - `SocialAccountId`, `AccessToken`, `RefreshToken`, `ExpiresAt`, `Scopes`, `EncryptedSecret`, `UpdatedAt`

**Content & Scheduling**

- `Posts`
  - `PostId`, `WorkspaceId`, `Title`, `CreatedByUserId`, `State`, `CreatedAt`, `UpdatedAt`, `Source`, …

- `PostVariants`
  - `PostVariantId`, `PostId`, `SocialAccountId`, `Text`, `Link`, `PostType`, `ScheduledAt`, `PublishedAt`, `State`, `ExternalPostId`, …

- `Schedules`
  - `ScheduleId`, `PostId`, `Type` (Single, Recurring, Queue), `RecurrenceRule`, `TimeZone`, `NextRunAt`, `EndAt`, …

- `QueueSlots`
  - `QueueSlotId`, `WorkspaceId`, `SocialAccountId`, `DayOfWeek`, `TimeOfDay`, `Position`, …

- `PublishJobs`
  - `JobId`, `PostVariantId`, `ScheduledAt`, `StartedAt`, `FinishedAt`, `Status`, `ErrorCode`, `ErrorMessage`, `RetryCount`

**Media**

- `MediaAssets`
  - `MediaId`, `WorkspaceId`, `Type`, `Url`, `ThumbnailUrl`, `Size`, `Duration`, `CreatedByUserId`, `CreatedAt`

- `MediaUsages`
  - `PostVariantId`, `MediaId`

**Analytics**

- `MetricsRaw`
  - `MetricId`, `SocialAccountId`, `PostVariantId`, `MetricType`, `Value`, `RecordedAt`

- `PostAnalyticsDaily`
  - `PostVariantId`, `Date`, `Impressions`, `Clicks`, `Likes`, `Comments`, `Shares`, `Saves`, …

- `AccountAnalyticsDaily`, `WorkspaceAnalyticsDaily`

- `Hashtags`
  - `HashtagId`, `WorkspaceId`, `Tag`

- `HashtagAnalyticsDaily`
  - `HashtagId`, `Date`, metrics…

- `Competitors`, `CompetitorMetricsDaily`

**Automation & Billing**

- `AutomationRules`, `AutomationTriggers`, `AutomationActions`, `AutomationRuns`

- `Plans`, `Subscriptions`, `Invoices`, `UsageLogs`

---

## 7. Social Network Integration

### 7.1 Provider Abstraction

Use a strategy pattern with `ISocialPublisher`:

- Each provider implementation:
  - Knows how to format payloads  
  - Calls provider-specific endpoints  
  - Handles provider-specific rate limits and errors  
- The main system works with generic `PostVariant` and `MediaAsset` objects and delegates specifics to providers.

### 7.2 Scheduling & Publishing Flow

1. User creates a post with one or more `PostVariants`.  
2. A `Schedule` is attached (single time, recurring, or queue-based).  
3. Scheduler worker runs periodically:
   - Finds due `Schedules` (`NextRunAt &lt;= now + horizon`)  
   - Creates `PublishJobs` and enqueues messages to message bus  
4. Publisher worker:
   - Consumes messages from `PublishJobs` queue  
   - Loads `PostVariant`, `SocialAccount`, `MediaAssets`  
   - Calls `ISocialPublisher.PublishAsync` for the appropriate provider  
   - Updates `PostVariant.State` (e.g., `scheduled` → `published` or `failed`)  
   - Updates `PublishJobs` with status and error details  

5. On failures:
   - Retry with exponential backoff (bounded)  
   - If still failing, mark as `failed`, notify user, and potentially set `SocialAccount` to `reauth_required`  

---

## 8. Technology Stack

### 8.1 Backend (ASP.NET Core Web API)

- ASP.NET Core Web API (.NET 8+)  
- Clean Architecture / Onion Architecture:
  - `Domain` – Entities, value objects, domain services  
  - `Application` – Use cases, service interfaces  
  - `Infrastructure` – EF Core, provider clients, messaging  
  - `WebApi` – Controllers, middleware, DI  

- EF Core with SQL Server  
- Redis for caching and rate limiting  
- Hangfire/Quartz.NET or custom scheduler with message bus for jobs  
- Swagger/OpenAPI for docs  
- Serilog + OpenTelemetry for logging and tracing  

### 8.2 Frontend (Angular)

- Angular (17+), stand-alone components  
- Routing modules per domain:
  - Auth, Workspaces, Social Accounts, Posts/Calendar, Media, Analytics, Settings/Billing  
- State Management:
  - NgRx, NGXS, or Akita  
- UI Components:
  - Angular Material, PrimeNG, or both  
- Charts:
  - ngx-charts, Chart.js, or ECharts  

### 8.3 Database (SQL Server)

- Azure SQL Database or managed SQL Server  
- Strong indexing strategy:
  - `WorkspaceId`, `SocialAccountId`, `PostId`, `State`, `ScheduledAt`, `CreatedAt`  
- Separate schema or tables for analytics to keep OLTP queries fast  

### 8.4 Infrastructure & DevOps

- Cloud (recommended): Azure
  - App Service (API + Angular)
  - Azure SQL Database
  - Azure Service Bus
  - Azure Blob Storage
  - Azure Redis Cache
  - Azure Application Insights

- CI/CD:
  - GitHub Actions or Azure DevOps  
  - Build & test on every commit  
  - Deploy to staging automatically, manual approval for production  

---

## 9. Security & Compliance

- All traffic over HTTPS, HSTS enabled  
- JWT authentication, short-lived tokens with refresh tokens  
- API keys for external integrations with scope-based permissions  
- Secrets in Key Vault (no secrets in code)  
- Token encryption at rest  
- Role-based authorization on all endpoints  
- Audit logs for important changes (e.g., roles, billing, publishing actions)  
- GDPR readiness:
  - Data export for users/workspaces  
  - Data deletion workflows  

---

## 10. Implementation Roadmap

### Phase 1 – MVP

- Identity & Workspaces  
- Connect a limited set of networks (e.g., Facebook, Instagram, LinkedIn, X)  
- Draft/schedule/publish basic post types (status, photo, link)  
- Basic calendar view  
- Basic media library  
- Minimal post-level analytics  
- Simple public API for posts and accounts  

### Phase 2 – v1

- Additional networks and content types  
- Roles/permissions and approval workflows  
- Automation engine v1 (time-based and simple triggers)  
- More complete analytics (best times, hashtags, member performance)  
- Billing and subscription flows with Stripe  
- Improved public API (analytics, media, automation)  

### Phase 3 – Advanced

- Full analytics suite including competitor analytics  
- Advanced automation (complex triggers, conditional logic, external integrations)  
- AI-assisted content (caption/hashtag suggestions, repurposing, scheduling recommendations)  
- Enterprise features: SSO, advanced audit logs, custom roles, SLA support  
- Multi-region deployments with higher SLAs