# Phase 9 – Deep Analytics: Hashtags, Members, Experiments

**Audience:**  
- Solo developer implementing advanced analytics capabilities.  
- Automated coding agents extending analytics beyond Phase 5.

**Goal of Phase 9:**  
Extend analytics (Phase 5) with:

- Hashtag analytics (per-hashtag metrics and top posts).  
- Member analytics (per-creator statistics).  
- Experiment / A/B testing framework for posts.  
- Deeper competitor analytics on top of Phase 7 competitor tracking.

These features are required parts of the product (not “nice to have”).

> IMPORTANT FOR CODING AGENTS:  
> - Build on Phase 5 analytics and Phase 7 competitor entities.  
> - Do not change existing metrics semantics; only add new entities and queries.

---

## 1. Domain – Hashtag Analytics

In `SocialOrchestrator.Domain`:

Create folder: `Hashtags/`.

### 1.1 Hashtag Entity

File: `Hashtags/Hashtag.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `string Tag` (without `#`, lowercase)
- `DateTime CreatedAt`

### 1.2 HashtagUsage Entity

File: `Hashtags/HashtagUsage.cs`

Represents the use of a hashtag in a `PostVariant`.

Properties:

- `Guid Id`
- `Guid HashtagId`
- `Guid PostVariantId`
- `DateTime UsedAtUtc`

### 1.3 HashtagAnalyticsDaily Entity

File: `Hashtags/HashtagAnalyticsDaily.cs`

Properties:

- `Guid Id`
- `Guid HashtagId`
- `DateTime Date`
- `int PostsCount`
- `int Impressions`
- `int Reach`
- `int TotalEngagements` (likes+comments+shares+clicks, etc.)

---

## 2. Domain – Member Analytics

Assuming we use ASP.NET Identity users as creators:

Create folder: `Members/` (or reuse `Users/`).

### 2.1 MemberAnalyticsDaily

File: `Members/MemberAnalyticsDaily.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `Guid UserId`
- `DateTime Date`
- `int PostsCreatedCount`
- `int VariantsPublishedCount`
- `int TotalEngagements` (sum of engagements for variants created by this user on that day)

---

## 3. Domain – Experiments / A/B Testing

Create folder: `Experiments/`.

### 3.1 Experiment Entity

File: `Experiments/Experiment.cs`

Represents an A/B test or multi-variant experiment.

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `string Name`
- `string? Description`
- `DateTime CreatedAt`
- `Guid CreatedByUserId`
- `bool IsActive`
- `DateTime? StartsAtUtc`
- `DateTime? EndsAtUtc`
- `string MetricType`  
  - e.g., `"Clicks"`, `"TotalEngagements"` – target metric for the experiment.
- `string TargetType`  
  - e.g., `"Post"` or `"PostVariant"`.

### 3.2 ExperimentVariant Entity

File: `Experiments/ExperimentVariant.cs`

Properties:

- `Guid Id`
- `Guid ExperimentId`
- `Guid PostVariantId`  
  - The variant in the experiment.
- `string Name` (e.g., “Headline A”, “Image B”)
- `bool IsControl` (true for control variant)

### 3.3 ExperimentResultDaily

File: `Experiments/ExperimentResultDaily.cs`

Properties:

- `Guid Id`
- `Guid ExperimentVariantId`
- `DateTime Date`
- `int Impressions`
- `int Reach`
- `int Clicks`
- `int TotalEngagements`

> Experiments use existing analytics (PostAnalyticsDaily) to compute results.

---

## 4. Domain – Enhanced Competitor Analytics

Phase 7 introduces:

- `Competitor`
- `CompetitorMetricsDaily`

Phase 9 will re-use these but add richer queries and DTOs; no new entities required unless necessary.

---

## 5. Infrastructure – EF Core for New Analytics Tables

In `SocialOrchestrator.Infrastructure.AppDbContext`:

Add DbSets:

- `DbSet<Hashtag> Hashtags { get; set; }`
- `DbSet<HashtagUsage> HashtagUsages { get; set; }`
- `DbSet<HashtagAnalyticsDaily> HashtagAnalyticsDaily { get; set; }`
- `DbSet<MemberAnalyticsDaily> MemberAnalyticsDaily { get; set; }`
- `DbSet<Experiment> Experiments { get; set; }`
- `DbSet<ExperimentVariant> ExperimentVariants { get; set; }`
- `DbSet<ExperimentResultDaily> ExperimentResultDaily { get; set; }`

### 5.1 Configuration

- `Hashtags`:
  - Table: `Hashtags`.
  - PK: `Id`.
  - Unique index: `(WorkspaceId, Tag)`.

- `HashtagUsages`:
  - Table: `HashtagUsages`.
  - PK: `Id`.
  - FK: `HashtagId` → `Hashtags.Id`.
  - FK: `PostVariantId` → `PostVariants.Id`.
  - Indexes: `(HashtagId)`, `(PostVariantId)`.

- `HashtagAnalyticsDaily`:
  - Table: `HashtagAnalyticsDaily`.
  - PK: `Id`.
  - Unique index: `(HashtagId, Date)`.

- `MemberAnalyticsDaily`:
  - Table: `MemberAnalyticsDaily`.
  - PK: `Id`.
  - Unique index: `(WorkspaceId, UserId, Date)`.

- `Experiments`:
  - Table: `Experiments`.
  - PK: `Id`.
  - Index: `(WorkspaceId, IsActive)`.

- `ExperimentVariants`:
  - Table: `ExperimentVariants`.
  - PK: `Id`.
  - FK: `ExperimentId` → `Experiments.Id`.
  - FK: `PostVariantId` → `PostVariants.Id`.

- `ExperimentResultDaily`:
  - Table: `ExperimentResultDaily`.
  - PK: `Id`.
  - Unique index: `(ExperimentVariantId, Date)`.

Create migration:

- Name: `Phase9_DeepAnalytics_Hashtags_Members_Experiments`.

Run `dotnet ef database update`.

---

## 6. Application Layer – Hashtag Analytics

In `SocialOrchestrator.Application`:

Create `Hashtags/Dto`:

- `HashtagSummaryDto`:
  - `Guid Id`
  - `string Tag`
  - `int TotalPosts`
  - `int TotalEngagements`

- `HashtagAnalyticsDto`:
  - `Guid HashtagId`
  - `DateTime Date`
  - `int PostsCount`
  - `int Impressions`
  - `int Reach`
  - `int TotalEngagements`

- `TopPostForHashtagDto`:
  - `Guid PostVariantId`
  - `Guid PostId`
  - `string? Title`
  - `string Text`
  - `int TotalEngagements`

Interface: `IHashtagAnalyticsService`:

Methods:

- `Task<Result<IReadOnlyList<HashtagSummaryDto>>> ListHashtagsAsync(Guid workspaceId, Guid userId);`
- `Task<Result<IReadOnlyList<HashtagAnalyticsDto>>> GetHashtagAnalyticsAsync(Guid workspaceId, Guid hashtagId, Guid userId, DateTime fromUtc, DateTime toUtc);`
- `Task<Result<IReadOnlyList<TopPostForHashtagDto>>> GetTopPostsForHashtagAsync(Guid workspaceId, Guid hashtagId, Guid userId, int topN, DateTime fromUtc, DateTime toUtc);`

Implementation in `SocialOrchestrator.Infrastructure`:

- Parse hashtags from PostVariant text:
  - Lowercase tags without `#`.
  - Insert into `Hashtags` + `HashtagUsages` when saving posts.
- Use `PostAnalyticsDaily` joined with `HashtagUsages` to populate `HashtagAnalyticsDaily` via background jobs (e.g., daily job).

---

## 7. Application Layer – Member Analytics

DTOs:

- `MemberAnalyticsSummaryDto`:
  - `Guid UserId`
  - `string Email` or `DisplayName`
  - `int PostsCreatedCount`
  - `int VariantsPublishedCount`
  - `int TotalEngagements`

- `MemberAnalyticsDailyDto`:
  - `Guid UserId`
  - `DateTime Date`
  - `int PostsCreatedCount`
  - `int VariantsPublishedCount`
  - `int TotalEngagements`

Interface: `IMemberAnalyticsService`:

Methods:

- `Task<Result<IReadOnlyList<MemberAnalyticsSummaryDto>>> GetWorkspaceMemberSummaryAsync(Guid workspaceId, Guid userId, DateTime fromUtc, DateTime toUtc);`
- `Task<Result<IReadOnlyList<MemberAnalyticsDailyDto>>> GetMemberAnalyticsAsync(Guid workspaceId, Guid memberId, Guid userId, DateTime fromUtc, DateTime toUtc);`

Implementation:

- Use `Posts.CreatedByUserId` and `PostVariants` + analytics to populate `MemberAnalyticsDaily` (via background job).
- Summarize across dates as needed.

---

## 8. Application Layer – Experiments / A/B Testing

DTOs (in `Experiments/Dto`):

- `ExperimentSummaryDto`:
  - `Guid Id`
  - `string Name`
  - `bool IsActive`
  - `DateTime CreatedAt`
  - `DateTime? StartsAtUtc`
  - `DateTime? EndsAtUtc`

- `ExperimentVariantDto`:
  - `Guid Id`
  - `Guid PostVariantId`
  - `string Name`
  - `bool IsControl`

- `ExperimentDetailDto`:
  - `ExperimentSummaryDto Experiment`
  - `IReadOnlyList<ExperimentVariantDto> Variants`

- `ExperimentVariantResultDto`:
  - `Guid ExperimentVariantId`
  - `Guid PostVariantId`
  - `string Name`
  - `bool IsControl`
  - `int Impressions`
  - `int Clicks`
  - `int TotalEngagements`
  - `double ConversionRate` (Clicks/Impressions if Impressions > 0)

Interface: `IExperimentService`:

Methods:

- `Task<Result<ExperimentDetailDto>> CreateExperimentAsync(Guid workspaceId, Guid userId, string name, string metricType, string targetType, IReadOnlyList<Guid> postVariantIds);`
- `Task<Result<IReadOnlyList<ExperimentSummaryDto>>> ListExperimentsAsync(Guid workspaceId, Guid userId);`
- `Task<Result<ExperimentDetailDto>> GetExperimentAsync(Guid workspaceId, Guid experimentId, Guid userId);`
- `Task<Result<IReadOnlyList<ExperimentVariantResultDto>>> GetExperimentResultsAsync(Guid workspaceId, Guid experimentId, Guid userId, DateTime fromUtc, DateTime toUtc);`
- `Task<Result> ActivateExperimentAsync(Guid workspaceId, Guid experimentId, Guid userId);`
- `Task<Result> DeactivateExperimentAsync(Guid workspaceId, Guid experimentId, Guid userId);`

Implementation:

- Creating an experiment:
  - Validate that all `PostVariantId`s belong to the workspace.
  - Create `Experiment` + `ExperimentVariant` rows.
- Results:
  - Join `ExperimentVariants` with `ExperimentResultDaily` (which in turn is computed from `PostAnalyticsDaily`).
  - Compute per-variant metrics and `ConversionRate`.

Background job:

- Periodically compute `ExperimentResultDaily` from `PostAnalyticsDaily` for active experiments.

---

## 9. Application Layer – Enhanced Competitor Analytics

Extend `ICompetitorService` or add a new interface `ICompetitorAnalyticsService`:

DTOs:

- `CompetitorComparisonDto`:
  - `Guid CompetitorId`
  - `string Name`
  - `string? Username`
  - `int FollowersStart`
  - `int FollowersEnd`
  - `int PostsCount`
  - `int TotalEngagements`
  - `double EngagementRate` (TotalEngagements / FollowersEnd, guard division by zero)

Interface:

- `Task<Result<IReadOnlyList<CompetitorComparisonDto>>> CompareCompetitorsAsync(Guid workspaceId, Guid userId, DateTime fromUtc, DateTime toUtc);`

Implementation:

- Use `CompetitorMetricsDaily` and aggregate over date range.
- Compare across all competitors in a workspace.

---

## 10. API – Deep Analytics Controllers

In `SocialOrchestrator.Api`:

### 10.1 HashtagAnalyticsController

Route: `/api/workspaces/{workspaceId:guid}/analytics/hashtags`

Endpoints:

- `GET /` – list hashtags (`IHashtagAnalyticsService.ListHashtagsAsync`).
- `GET /{hashtagId}` – get per-day metrics.
- `GET /{hashtagId}/top-posts` – get top N posts (with query param `topN` and date range).

### 10.2 MemberAnalyticsController

Route: `/api/workspaces/{workspaceId:guid}/analytics/members`

Endpoints:

- `GET /` – workspace member summary.
- `GET /{memberId}` – per-day metrics.

### 10.3 ExperimentsController

Route: `/api/workspaces/{workspaceId:guid}/experiments`

Endpoints:

- `GET /` – list experiments.
- `POST /` – create experiment.
- `GET /{experimentId}` – get detail.
- `GET /{experimentId}/results` – get results.
- `POST /{experimentId}/activate`
- `POST /{experimentId}/deactivate`

### 10.4 CompetitorAnalyticsController

Route: `/api/workspaces/{workspaceId:guid}/analytics/competitors`

Endpoints:

- `GET /compare` – returns `CompetitorComparisonDto` list.

All endpoints `[Authorize]` and validate workspace membership.

---

## 11. Frontend – Deep Analytics UI

In Angular:

### 11.1 Hashtag Analytics

- Add views under `AnalyticsModule`:
  - `HashtagListComponent`:
    - List hashtags with total posts & engagement.
  - `HashtagDetailComponent`:
    - Show time-series metrics and top posts.

### 11.2 Member Analytics

- Components:
  - `MemberAnalyticsSummaryComponent`:
    - Table of members, posts, engagement.
  - `MemberAnalyticsDetailComponent`:
    - Per-day charts for one member.

### 11.3 Experiments UI

- Components:
  - `ExperimentListComponent`:
    - List experiments, active/ended status.
  - `ExperimentDetailComponent`:
    - Show variants and their metrics.
    - Mark control variant.
    - Visual comparison (bar chart, table).

### 11.4 Competitor Comparison UI

- Component:
  - `CompetitorComparisonComponent`:
    - Table or chart comparing competitors’ followers, posts, engagement, engagement rate.

---

## 12. Manual Verification Checklist (End of Phase 9)

1. **DB**:
   - Tables for hashtags, member analytics, experiments exist.
   - Data is populated via background jobs for real posts.

2. **Hashtags**:
   - Hashtags are extracted from new posts and recorded.
   - Hashtag analytics endpoints return reasonable data.

3. **Members**:
   - Member analytics summaries reflect who creates/publishes posts.
   - Charts show plausible trends.

4. **Experiments**:
   - You can create experiments linking variants.
   - Results show per-variant metrics and conversion rates.
   - Deactivating experiments stops new result aggregation.

5. **Competitors**:
   - Comparison endpoint works and UI reflects differences between competitors.

---

## 13. Instructions for Automated Coding Agents

- Always treat analytics tables as **append-only and aggregated**. Do not rewrite history except via migrations.
- For metrics not available from providers yet, you can:
  - Default to zero or skip; never fabricate non-zero values.
  - Add `TODO` comments where needed.
- Ensure all analytics endpoints are read-only; no side effects.
- Preserve existing analytics logic from Phase 5; extend it without breaking behavior.

This completes the specification for **Phase 9 – Deep Analytics: Hashtags, Members, Experiments**.