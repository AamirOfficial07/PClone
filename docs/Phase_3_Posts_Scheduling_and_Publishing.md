# Phase 3 – Posts, Scheduling, and Publishing Pipeline

**Audience:**  
- Solo developer implementing core posting functionality.  
- Automated coding agents implementing backend + frontend logic.

**Goal of Phase 3:**  
Implement the **core capability** of SocialOrchestrator: creating posts, scheduling them, and publishing them to connected social accounts.

After Phase 3 is completed:

- Users can:
  - Create a conceptual **Post** under a workspace.
  - Create one or more **PostVariants** targeting specific social accounts.
  - Schedule each PostVariant at a specific date/time.
- A background job:
  - Detects due PostVariants.
  - Publishes content to provider APIs via the established Social Connectors.
  - Updates status and logs failures.
- The Angular SPA has:
  - Basic post composer for text/link/photo/video.
  - Simple list + detail view for posts.
  - Basic calendar-like or list-based view of scheduled posts.

> IMPORTANT FOR CODING AGENTS:  
> - Implement only single-run schedules in this phase (no recurring or queue-based scheduling).  
> - Do not implement recycling/evergreen posts or automation rules yet.  
> - If behavior is unclear, add a `TODO` comment and keep logic minimal.

---

## 1. Domain Model – Posts and Scheduling

In `SocialOrchestrator.Domain`:

Create folder: `Posts/`.

### 1.1 PostState Enum

File: `Posts/PostState.cs`

Values:

- `Draft = 0`
- `Scheduled = 1`
- `Published = 2`
- `Failed = 3`
- `Cancelled = 4`

### 1.2 PostType Enum

File: `Posts/PostType.cs`

Values (for Phase 3):

- `Status = 0` (text only)
- `Link = 1`
- `Photo = 2`
- `Video = 3`

> Additional types (reel, story, poll, etc.) will be added in later phases.

### 1.3 Post Entity

File: `Posts/Post.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `string Title` (optional; user-friendly name for the post)
- `string? Notes` (internal notes for team)
- `Guid CreatedByUserId`
- `Guid? ApprovedByUserId` (null until approved; simple approval logic can be added later)
- `DateTime CreatedAt`
- `DateTime? UpdatedAt`

> State is tracked at the **PostVariant** level, not on the Post itself.

### 1.4 PostVariant Entity

File: `Posts/PostVariant.cs`

Properties:

- `Guid Id`
- `Guid PostId`
- `Guid SocialAccountId`
- `PostType Type`
- `string Text`  
  - Caption or message.
- `string? LinkUrl`  
  - For link posts.
- `Guid? MediaAssetId`  
  - For a single media item (Phase 3). Multi-media will come later.
- `PostState State`
- `DateTime? ScheduledAtUtc`
- `DateTime? PublishedAtUtc`
- `string? ProviderPostId`  
  - ID returned by provider after publishing.
- `string? LastErrorMessage`  
  - For the last failure if any.
- `DateTime CreatedAt`
- `DateTime? UpdatedAt`

> For simplicity in Phase 3, allow at most **one media asset** per PostVariant. Multi-image carousels will be handled in later phases.

---

## 2. Infrastructure – EF Core Configuration

In `SocialOrchestrator.Infrastructure`:

### 2.1 DbSet Properties

Add to `AppDbContext`:

- `DbSet<Post> Posts { get; set; }`
- `DbSet<PostVariant> PostVariants { get; set; }`

### 2.2 Entity Configuration

Configure `Post`:

- Table name: `Posts`.
- Primary key: `Id`.
- Index on `WorkspaceId`.
- Required: `WorkspaceId`, `CreatedByUserId`, `CreatedAt`.

Configure `PostVariant`:

- Table name: `PostVariants`.
- Primary key: `Id`.
- Foreign key: `PostId` → `Posts.Id`.
- Foreign key: `SocialAccountId` → `SocialAccounts.Id`.
- Index on `(SocialAccountId, ScheduledAtUtc)` for scheduling queries.
- Required fields: `PostId`, `SocialAccountId`, `Type`, `State`.

### 2.3 Migration

Create EF migration:

- Name: `Phase3_PostsAndPostVariants`.

Apply migration:

- `dotnet ef database update`.

Verify new tables:

- `Posts`
- `PostVariants`

---

## 3. Application Layer – Post Use Cases

In `SocialOrchestrator.Application`:

Create folder: `Posts/Dto`.

### 3.1 DTOs

Create `CreatePostRequest`:

- `Guid WorkspaceId`
- `string? Title`
- `string? Notes`

Create `CreatePostVariantRequest`:

- `Guid SocialAccountId`
- `PostType Type`
- `string Text`
- `string? LinkUrl`
- `Guid? MediaAssetId`
- `DateTime ScheduledAt` (assume this is in workspace local time; we will convert to UTC in service)

Create `PostVariantSummaryDto`:

- `Guid Id`
- `Guid SocialAccountId`
- `PostType Type`
- `string Text`
- `PostState State`
- `DateTime? ScheduledAtUtc`
- `DateTime? PublishedAtUtc`
- `string? LastErrorMessage`

Create `PostDetailDto`:

- `Guid Id`
- `Guid WorkspaceId`
- `string? Title`
- `string? Notes`
- `Guid CreatedByUserId`
- `DateTime CreatedAt`
- `IReadOnlyList<PostVariantSummaryDto> Variants`

Create `ListPostsRequest`:

- `Guid WorkspaceId`
- `int PageNumber`
- `int PageSize`
- `PostState? State` (optional filter)
- `Guid? SocialAccountId` (optional filter)
- `DateTime? FromUtc`
- `DateTime? ToUtc`

Create `PostListItemDto`:

- `Guid Id`
- `string? Title`
- `DateTime CreatedAt`
- `int VariantCount`
- `int PublishedCount`
- `int FailedCount`
- `int ScheduledCount`

### 3.2 Service Interface

Create folder: `Posts/Services`.

Interface `IPostService`:

- `Task<Result<PostDetailDto>> CreatePostWithVariantsAsync(Guid userId, CreatePostRequest postRequest, IReadOnlyList<CreatePostVariantRequest> variantRequests)`  
  - Creates a Post plus associated PostVariants.  
  - Converts `ScheduledAt` from workspace local time to UTC.

- `Task<Result<PostDetailDto>> GetPostAsync(Guid workspaceId, Guid postId, Guid userId)`

- `Task<Result<PagedResult<PostListItemDto>>> ListPostsAsync(ListPostsRequest request, Guid userId)`

> In Phase 3, we only implement create and list. Editing/deleting can come later.

---

## 4. Infrastructure – PostService Implementation

In `SocialOrchestrator.Infrastructure`:

Create folder: `Posts/`.

Class: `PostService` implements `IPostService`.

Dependencies:

- `AppDbContext _dbContext`
- Possibly a `TimeZoneConverter` helper to handle workspace time zones.

### 4.1 CreatePostWithVariantsAsync

Steps:

1. Validate that `userId` is a member of the workspace and is allowed to create posts (Owner/Admin/Member).
2. Create `Post`:
   - Set `WorkspaceId`, `Title`, `Notes`, `CreatedByUserId`, `CreatedAt`.
3. For each `CreatePostVariantRequest`:
   - Validate `SocialAccountId` belongs to the same `WorkspaceId`.
   - Convert `ScheduledAt` (workspace local time) to UTC:
     - Use workspace time zone from `Workspace.TimeZone`.
   - Create `PostVariant` with:
     - `PostId`
     - `SocialAccountId`
     - `Type`
     - `Text`
     - `LinkUrl`
     - `MediaAssetId`
     - `State = PostState.Scheduled`
     - `ScheduledAtUtc` = converted value
     - `CreatedAt`
4. Save changes.
5. Return `PostDetailDto` including all variants.

> FOR CODING AGENTS:  
> - If time zone conversion library is not specified, use `TimeZoneInfo` from .NET and add TODO comments for edge cases like DST.

### 4.2 GetPostAsync

- Verify user belongs to workspace.
- Query `Post` with `PostVariants` by `postId` and `workspaceId`.
- Map to `PostDetailDto`.
- Return `Result.Failure` if not found or unauthorized.

### 4.3 ListPostsAsync

- Verify user belongs to workspace.
- Filter by workspace, optional state, optional social account, date range (using `ScheduledAtUtc` or `CreatedAt` as appropriate).
- Paginate using `PageNumber` and `PageSize`.
- For each Post:
  - Count variants by state.
- Return `PagedResult<PostListItemDto>`.

---

## 5. Scheduling & Publishing – Background Jobs

### 5.1 Representing Publish Jobs

We will use **Hangfire recurring jobs** and normal scheduled jobs.

- For each `PostVariant` with `State = Scheduled`:
  - We need a job that runs at `ScheduledAtUtc` to publish it.

Design choice for Phase 3:

- **No separate table for jobs** in Domain; treat `PostVariant` and Hangfire as sufficient.

### 5.2 Scheduling Jobs on Creation

In `PostService.CreatePostWithVariantsAsync`:

- After saving `PostVariants`, enqueue a Hangfire job for each variant:

  - Use `BackgroundJob.Schedule` with `ScheduledAtUtc`.

- Create a dedicated service for publishing:

  - Interface: `IPostPublishingService`
    - Method: `Task PublishPostVariantAsync(Guid postVariantId)`

  - Implementation will:
    - Load PostVariant + SocialAccount + SocialAuthToken.
    - Decide which provider to use (`ISocialPublisher`).
    - Publish.
    - Update `PostVariant` state and logs.

> FOR CODING AGENTS:  
> - Implement `IPostPublishingService` in Phase 3 with minimal logic for Facebook only.  
> - Add TODO comments for other providers.

### 5.3 Publishing Service Implementation

In `SocialOrchestrator.Application`:

- Create `IPostPublishingService` (interface only).

In `SocialOrchestrator.Infrastructure`:

Create `Posts/PostPublishingService.cs` implementing `IPostPublishingService`.

Steps in `PublishPostVariantAsync`:

1. Load `PostVariant` by `postVariantId`.
2. If `State` is not `Scheduled`, return (avoid double-processing).
3. Load associated `Post`, `SocialAccount`, `SocialAuthToken`.
4. Determine provider (`ISocialPublisher`) based on `SocialAccount.NetworkType`.
5. Build publish payload:
   - Include text, link, media file URL (from `MediaAsset` if present; MediaAsset will be defined in Phase 4, so in Phase 3 you may temporarily stub or assume media is not used yet).
6. Call provider’s publish method:
   - For Phase 3, define `ISocialPublisher.PublishAsync(PostVariant, SocialAccount, CancellationToken)` with a minimal model.
7. Update `PostVariant`:
   - On success:
     - `State = Published`.
     - `PublishedAtUtc = DateTime.UtcNow`.
     - `ProviderPostId` = ID returned by provider.
     - `LastErrorMessage = null`.
   - On failure:
     - `State = Failed`.
     - `LastErrorMessage = error message`.

> Since Media library comes in Phase 4, in Phase 3 you can assume `MediaAssetId` is null and only publish text/link posts. Add TODO for media support.

### 5.4 Hangfire Configuration

In `SocialOrchestrator.Api` `Program.cs`:

- Add Hangfire services:

  - Use `AddHangfire` with SQL Server storage.
  - Use `AddHangfireServer`.

- Use Hangfire dashboard (optional; protect it with admin auth later).

---

## 6. API Controllers – Posts

In `SocialOrchestrator.Api`:

Create `PostsController`:

- Route: `[Route("api/workspaces/{workspaceId:guid}/posts")]`
- `[Authorize]` on controller.

Endpoints:

1. `POST /api/workspaces/{workspaceId}/posts`
   - Accepts:
     - `CreatePostRequest` (from body) and an array/list of `CreatePostVariantRequest`.
       - To avoid complex binding errors, define a wrapper model:

       ```csharp
       public class CreatePostWithVariantsRequest
       {
           public CreatePostRequest Post { get; set; }
           public List<CreatePostVariantRequest> Variants { get; set; }
       }
       ```

   - Validate:
     - Authenticated user.
     - User belongs to workspace.
   - Calls `IPostService.CreatePostWithVariantsAsync(userId, postRequest, variants)`.
   - Returns `PostDetailDto`.

2. `GET /api/workspaces/{workspaceId}/posts/{postId}`
   - Calls `IPostService.GetPostAsync`.
   - Returns `PostDetailDto`.

3. `GET /api/workspaces/{workspaceId}/posts`
   - Accepts query params for:
     - `pageNumber`, `pageSize`, `state`, `socialAccountId`, `fromUtc`, `toUtc`.
   - Populates `ListPostsRequest`.
   - Calls `IPostService.ListPostsAsync`.
   - Returns `PagedResult<PostListItemDto>`.

> FOR CODING AGENTS:  
> - Do not implement edit/delete endpoints for posts in this phase.  
> - Do not implement operations to manually trigger publishing (only background jobs).

---

## 7. Frontend – Basic Post Composer and List

In Angular app:

### 7.1 Routing

Add route under `WorkspacesModule`:

- `/workspaces/:workspaceId/posts` → list view.
- `/workspaces/:workspaceId/posts/new` → composer view.
- `/workspaces/:workspaceId/posts/:postId` → detail view.

### 7.2 Services

Create `PostApiService`:

Methods:

- `createPost(workspaceId: string, payload: CreatePostWithVariantsRequest)`
- `getPost(workspaceId: string, postId: string)`
- `listPosts(workspaceId: string, filters: { state?: PostState; pageNumber?: number; pageSize?: number; ... })`

The TypeScript interfaces should mirror the DTOs from the backend.

### 7.3 Components

1. `PostListComponent`:
   - Displays paginated list of posts:
     - Title, created date, counts for scheduled/published/failed.
   - Filters by state and social account.
   - Button to create new post.

2. `PostComposerComponent`:
   - Form fields:
     - Title
     - Notes (optional)
     - One or more target accounts (multi-select from connected SocialAccounts).
   - For each target account, create a variant:
     - Type (Status/Link)
     - Text
     - LinkUrl (if type is Link)
     - ScheduledAt (date and time in workspace local time)
   - On submit:
     - Build `CreatePostWithVariantsRequest`.
     - Call `createPost`.
     - Navigate back to list or to detail view.

3. `PostDetailComponent`:
   - Shows:
     - Post info (title, notes, created by, created date).
     - Variants table:
       - Account name, type, text, state, scheduledAt, publishedAt, lastErrorMessage.

> For Phase 3, keep UI minimal and functional. Visual polish can come later.

---

## 8. Manual Verification Checklist (End of Phase 3)

1. **Database**:
   - `Posts` and `PostVariants` tables exist.
   - Data is inserted when creating posts.

2. **API**:
   - `POST /api/workspaces/{workspaceId}/posts` creates post and variants.
   - `GET /api/workspaces/{workspaceId}/posts` lists posts with pagination.
   - `GET /api/workspaces/{workspaceId}/posts/{postId}` returns detail with variants.

3. **Scheduling & Publishing**:
   - When you create a scheduled post for a time in the near future:
     - A Hangfire job is created (visible in dashboard if enabled).
     - At the scheduled time, the job runs and:
       - For now, can log or stub provider publish call (if full integration is not yet possible).
       - Updates `PostVariant` state to Published or Failed.
   - No unexpected duplicates or missed jobs.

4. **Frontend**:
   - You can create posts via UI.
   - Scheduled posts appear in the list.
   - After publishing time, states update (may require refreshing the page or adding basic polling).

---

## 9. Instructions for Automated Coding Agents

- Do not support recurring/queue-based/recycling posts in this phase.
- Implement only the `PostType` values specified.
- When handling time zones, use `Workspace.TimeZone` and `TimeZoneInfo` where possible; add TODOs for tricky edge cases.
- If provider API details are missing, stub out the network calls (log instead of real HTTP) but keep method signatures correct.
- After all tasks in this doc are completed, stop and wait for Phase 4 before implementing media library or advanced features.

This completes the specification for **Phase 3 – Posts, Scheduling, and Publishing Pipeline**.