# Phase 5 – Analytics Basics and “Best Times to Post”

**Audience:**  
- Solo developer implementing first analytics features.  
- Automated coding agents adding read-only analytics.

**Goal of Phase 5:**  
Provide **basic analytics** and an initial version of **“best times to post”** so that SocialOrchestrator already goes beyond many tools by giving actionable insights.

After Phase 5 is completed:

- The system stores daily per-post metrics (impressions, likes/reactions, comments, etc.) where provider APIs allow it.
- The system stores daily per-account metrics (followers count, posts count).
- The frontend exposes:
  - Per-post metrics view.
  - Simple workspace-level analytics page with:
    - Total posts, total engagement over a period.
    - A “best times to post” heatmap (day-of-week vs hour-of-day) based on engagement.

> IMPORTANT FOR CODING AGENTS:  
> - Only implement **read-only analytics**; do not modify publishing behavior in this phase.  
> - For providers where metrics APIs are unknown or unavailable, add `TODO` and stub behavior.  
> - Focus on a provider where analytics is reasonably accessible (Facebook is again a good starting point).

---

## 1. Domain Model – Analytics

In `SocialOrchestrator.Domain`:

Create folder: `Analytics/`.

### 1.1 PostMetricType Enum

File: `Analytics/PostMetricType.cs`

Values:

- `Impressions = 1`
- `Reach = 2`
- `Likes = 3`
- `Comments = 4`
- `Shares = 5`
- `Clicks = 6`

You can extend later; keep this initial set for Phase 5.

### 1.2 PostAnalyticsDaily Entity

File: `Analytics/PostAnalyticsDaily.cs`

Properties:

- `Guid Id`
- `Guid PostVariantId`
- `DateTime Date` (UTC date; time portion ignored)
- `int Impressions`
- `int Reach`
- `int Likes`
- `int Comments`
- `int Shares`
- `int Clicks`

### 1.3 AccountAnalyticsDaily Entity

File: `Analytics/AccountAnalyticsDaily.cs`

Properties:

- `Guid Id`
- `Guid SocialAccountId`
- `DateTime Date` (UTC date)
- `int FollowersCount`
- `int PostsCount`
- `int TotalEngagements` (sum of likes+comments+shares for the day, if known)

> For Phase 5, we aggregate many metrics into `TotalEngagements` rather than storing per-type details for the account.

---

## 2. Infrastructure – EF Core for Analytics

In `SocialOrchestrator.Infrastructure`:

### 2.1 DbSet

Add to `AppDbContext`:

- `DbSet<PostAnalyticsDaily> PostAnalyticsDaily { get; set; }`
- `DbSet<AccountAnalyticsDaily> AccountAnalyticsDaily { get; set; }`

### 2.2 Entity Configuration

Configure `PostAnalyticsDaily`:

- Table name: `PostAnalyticsDaily`.
- Primary key: `Id`.
- Unique index on `(PostVariantId, Date)`.

Configure `AccountAnalyticsDaily`:

- Table name: `AccountAnalyticsDaily`.
- Primary key: `Id`.
- Unique index on `(SocialAccountId, Date)`.

### 2.3 Migration

Create migration:

- Name: `Phase5_AnalyticsBasics`.

Run:

- `dotnet ef migrations add Phase5_AnalyticsBasics`
- `dotnet ef database update`.

Verify tables: `PostAnalyticsDaily`, `AccountAnalyticsDaily`.

---

## 3. Application Layer – Analytics Services

In `SocialOrchestrator.Application`:

Create folder: `Analytics/Dto`.

### 3.1 DTOs

- `PostAnalyticsDto`:
  - `Guid PostVariantId`
  - `DateTime Date`
  - `int Impressions`
  - `int Reach`
  - `int Likes`
  - `int Comments`
  - `int Shares`
  - `int Clicks`

- `AccountAnalyticsSummaryDto`:
  - `Guid SocialAccountId`
  - `DateTime From`
  - `DateTime To`
  - `int FollowersStart`
  - `int FollowersEnd`
  - `int PostsCount`
  - `int TotalEngagements`

- `WorkspaceOverviewAnalyticsDto`:
  - `Guid WorkspaceId`
  - `DateTime From`
  - `DateTime To`
  - `int TotalPosts`
  - `int TotalPublishedVariants`
  - `int TotalEngagements`
  - `int TotalImpressions`
  - `BestTimeSlotDto[,] BestTimeHeatmap`
    - 7 x 24 grid (day-of-week x hour-of-day) or similar.

- `BestTimeSlotDto`:
  - `int DayOfWeek`  (0=Sunday .. 6=Saturday)
  - `int HourOfDay`  (0..23, UTC or workspace local; decide and document)
  - `int EngagementScore` (aggregate metric, e.g., likes+comments+shares)

### 3.2 Interface: IAnalyticsService

File: `Analytics/Services/IAnalyticsService.cs`

Methods:

- `Task<Result<IReadOnlyList<PostAnalyticsDto>>> GetPostAnalyticsAsync(Guid workspaceId, Guid postId, Guid userId, DateTime fromUtc, DateTime toUtc);`
- `Task<Result<AccountAnalyticsSummaryDto>> GetAccountAnalyticsSummaryAsync(Guid workspaceId, Guid socialAccountId, Guid userId, DateTime fromUtc, DateTime toUtc);`
- `Task<Result<WorkspaceOverviewAnalyticsDto>> GetWorkspaceOverviewAsync(Guid workspaceId, Guid userId, DateTime fromUtc, DateTime toUtc);`

> This interface is read-only; writing analytics data is handled by background jobs and provider clients.

---

## 4. Infrastructure – AnalyticsService Implementation

In `SocialOrchestrator.Infrastructure`:

Create folder: `Analytics/`.

Class: `AnalyticsService` implements `IAnalyticsService`.

Dependencies:

- `AppDbContext _dbContext`.

### 4.1 GetPostAnalyticsAsync

Steps:

1. Validate `userId` is a member of `workspaceId`.
2. Verify `postId` belongs to `workspaceId`.
3. Get all `PostVariants` for `postId`.
4. Fetch `PostAnalyticsDaily` entries where:
   - `PostVariantId` in that set.
   - `Date` between `fromUtc.Date` and `toUtc.Date`.
5. Map each entry to `PostAnalyticsDto`.
6. Return list.

### 4.2 GetAccountAnalyticsSummaryAsync

Steps:

1. Validate `userId` is a member of `workspaceId`.
2. Verify `socialAccountId` belongs to Workspace.
3. Fetch `AccountAnalyticsDaily` entries for this account between `fromUtc.Date` and `toUtc.Date`.
4. Compute:
   - `FollowersStart` = followers count on `fromUtc.Date` or earliest available date after.
   - `FollowersEnd` = followers count on `toUtc.Date` or latest available date before.
   - `PostsCount` = sum of `PostsCount`.
   - `TotalEngagements` = sum of `TotalEngagements`.
5. Return `AccountAnalyticsSummaryDto`.

### 4.3 GetWorkspaceOverviewAsync

Steps:

1. Validate `userId` is member of workspace.
2. Fetch `PostVariants` for workspace with `PublishedAtUtc` between `fromUtc` and `toUtc`.
3. Count:
   - `TotalPosts` = distinct Posts count.
   - `TotalPublishedVariants` = number of variants with `State = Published`.
4. Join with `PostAnalyticsDaily` to sum:
   - `TotalEngagements` = sum of likes+comments+shares across all variants in range.
   - `TotalImpressions` = sum of impressions.
5. Build **Best Time Heatmap**:
   - For each PostVariant with analytics data:
     - For each `PostAnalyticsDaily` row in range:
       - Determine posting time:
         - Use `PostVariant.PublishedAtUtc` or `ScheduledAtUtc`.
         - Convert to workspace local time (using `Workspace.TimeZone`) – this is important for user-facing “best times”.
       - Extract `dayOfWeek` and `hourOfDay`.
       - Add engagement value (e.g., likes + comments + shares) to `EngagementScore` at `[dayOfWeek][hourOfDay]`.
   - Normalize or leave as raw counts (document that it’s raw engagement sum).
6. Construct `WorkspaceOverviewAnalyticsDto` with a 7x24 or 7xN grid of `BestTimeSlotDto`.

Register `IAnalyticsService` in DI:

- `services.AddScoped<IAnalyticsService, AnalyticsService>();`

---

## 5. Provider Integrations – Fetching Metrics (Background Jobs)

Phase 5 includes basic **metrics ingestion**. Focus on one provider (e.g., Facebook) and design generic interfaces.

### 5.1 Metrics Fetching Interface

In `SocialOrchestrator.Application`:

Create `Analytics/Services/IPostMetricsFetcher.cs`:

Methods:

- `Task FetchAndStorePostMetricsAsync(Guid postVariantId, CancellationToken cancellationToken = default);`
  - For one PostVariant.

- `Task FetchAndStoreAccountDailyMetricsAsync(Guid socialAccountId, DateTime dateUtc, CancellationToken cancellationToken = default);`

In `SocialOrchestrator.Infrastructure`:

Create `Analytics/PostMetricsFetcher.cs` implementing `IPostMetricsFetcher`:

- This service will:
  - Determine provider (based on SocialAccount.NetworkType).
  - Use provider-specific APIs to fetch metrics.
  - Update `PostAnalyticsDaily` and `AccountAnalyticsDaily`.

> FOR CODING AGENTS:  
> - If provider APIs are not accessible, stub calls and log TODO.  
> - Ensure DB updates and entity relationships are implemented correctly.

### 5.2 Background Jobs

Use Hangfire for recurring jobs:

1. **Per-Post Metrics Job**:
   - Recurring job, e.g., every hour:
     - Query `PostVariants` that are `Published` and not too old (e.g., published in last 30 days).
     - For each, call `IPostMetricsFetcher.FetchAndStorePostMetricsAsync(postVariant.Id)`.

2. **Per-Account Daily Metrics Job**:
   - Recurring job daily, e.g., at 02:00 UTC:
     - For each active `SocialAccount`:
       - Call `IPostMetricsFetcher.FetchAndStoreAccountDailyMetricsAsync(socialAccount.Id, DateTime.UtcNow.Date.AddDays(-1))`.

> You can start with a very simple implementation (e.g., only logs) and later fill in provider-specific logic.

---

## 6. API – Analytics Controllers

In `SocialOrchestrator.Api`:

### 6.1 PostAnalyticsController

Route: `[Route("api/workspaces/{workspaceId:guid}/posts/{postId:guid}/analytics")]`
- `[Authorize]` on controller.

Endpoint:

- `GET /api/workspaces/{workspaceId}/posts/{postId}/analytics`
  - Query params: `fromUtc`, `toUtc`.
  - Calls `IAnalyticsService.GetPostAnalyticsAsync`.
  - Returns list of `PostAnalyticsDto`.

### 6.2 AccountsAnalyticsController

Route: `[Route("api/workspaces/{workspaceId:guid}/accounts/{socialAccountId:guid}/analytics")]`
- `[Authorize]`.

Endpoint:

- `GET /api/workspaces/{workspaceId}/accounts/{socialAccountId}/analytics`
  - Query: `fromUtc`, `toUtc`.
  - Calls `IAnalyticsService.GetAccountAnalyticsSummaryAsync`.
  - Returns `AccountAnalyticsSummaryDto`.

### 6.3 WorkspaceAnalyticsController

Route: `[Route("api/workspaces/{workspaceId:guid}/analytics")]`
- `[Authorize]`.

Endpoint:

- `GET /api/workspaces/{workspaceId}/overview`
  - Query: `fromUtc`, `toUtc`.
  - Calls `IAnalyticsService.GetWorkspaceOverviewAsync`.
  - Returns `WorkspaceOverviewAnalyticsDto`.

---

## 7. Frontend – Analytics UI

In Angular:

### 7.1 Analytics Module

Create `AnalyticsModule`:

Routes:

- `/workspaces/:workspaceId/analytics` → `WorkspaceAnalyticsComponent`
- `/workspaces/:workspaceId/posts/:postId/analytics` → `PostAnalyticsComponent`
- `/workspaces/:workspaceId/accounts/:socialAccountId/analytics` → `AccountAnalyticsComponent`

### 7.2 Angular Service

Create `AnalyticsApiService`:

Methods:

- `getPostAnalytics(workspaceId, postId, fromUtc, toUtc): Observable<PostAnalyticsDto[]>`
- `getAccountAnalytics(workspaceId, accountId, fromUtc, toUtc): Observable<AccountAnalyticsSummaryDto>`
- `getWorkspaceOverview(workspaceId, fromUtc, toUtc): Observable<WorkspaceOverviewAnalyticsDto>`

### 7.3 Components

1. `WorkspaceAnalyticsComponent`:
   - Inputs: `workspaceId`.
   - Date range picker (default last 30 days).
   - Calls `getWorkspaceOverview`.
   - Shows:
     - TotalPosts, TotalPublishedVariants, TotalEngagements, TotalImpressions.
   - Renders **heatmap**:
     - Use simple table/grid:
       - Rows = days of week.
       - Columns = hours (0–23).
       - Cell color intensity based on `EngagementScore`.

2. `PostAnalyticsComponent`:
   - Shows list or chart of metrics over time for specific `postId`.
   - For Phase 5, simple table:
     - Date, Impressions, Reach, Likes, Comments, Shares, Clicks.

3. `AccountAnalyticsComponent`:
   - Shows summary for one social account:
     - FollowersStart, FollowersEnd, PostsCount, TotalEngagements.
   - Optionally, a simple line chart for followers over time can be added later.

---

## 8. “Beyond Publer” Angle at Phase 5

Even at this stage, SocialOrchestrator gets ahead by:

- Providing a **clear best-times heatmap** based not just on posting time but on actual engagement metrics.
- Designing analytics storage for future advanced features:
  - AI models can later use `PostAnalyticsDaily` as training data.
- A structured API for analytics that can be easily extended.

---

## 9. Manual Verification Checklist (End of Phase 5)

1. **Database**:
   - `PostAnalyticsDaily` and `AccountAnalyticsDaily` tables exist.
   - Background jobs write sample rows (even if stubbed metrics).

2. **Background Jobs**:
   - Hangfire shows recurring jobs for:
     - Per-post metrics.
     - Per-account daily metrics.
   - Jobs run without throwing unhandled exceptions.

3. **API**:
   - `GET /api/workspaces/{workspaceId}/analytics/overview` returns a DTO with non-empty `BestTimeHeatmap` (even if values are small or stubbed).
   - Post and account analytics endpoints return data structures matching DTOs.

4. **Frontend**:
   - Workspace analytics page renders summary and a heatmap grid.
   - Post analytics page shows per-date metrics.
   - Account analytics page shows a reasonable summary.

---

## 10. Instructions for Automated Coding Agents

- Do not introduce new analytics dimensions beyond those specified.
- If provider APIs for metrics are unknown, populate analytics tables with fake/stub data in jobs but keep the interfaces and flows correct.
- Keep “best times” computation logic transparent and deterministic; do not introduce any randomization or AI in this phase.
- After finishing, wait for Phase 6, which will focus on **automation/rules engine** and later phases on **AI-assisted features**.

This completes the specification for **Phase 5 – Analytics Basics and “Best Times to Post”**.