# Phase 10 – Collaboration: Approvals, Comments, Activity & Notifications

**Audience:**  
- Solo developer implementing collaboration features.  
- Automated coding agents adding team workflows.

**Goal of Phase 10:**  
Provide a full collaboration layer on top of posts:

- Approval workflows (draft → pending → approved/rejected).  
- Comments on posts (discussion threads).  
- Activity log/audit trail.  
- Notification system (in-app and email) driven by events (e.g., approval requests, failures).

These are core features, not optional.

> IMPORTANT FOR CODING AGENTS:  
> - Build on existing Post model from Phase 3 and workspace/member concepts from Phase 1.  
> - Do not trigger notifications from UI; notifications must be emitted from backend logic.

---

## 1. Domain – Approvals

In `SocialOrchestrator.Domain`:

Create folder: `Collaboration/`.

### 1.1 ApprovalStatus Enum

File: `Collaboration/ApprovalStatus.cs`

Values:

- `None = 0`          (no approval process started)
- `Pending = 1`
- `Approved = 2`
- `Rejected = 3`

### 1.2 PostApproval Entity

File: `Collaboration/PostApproval.cs`

Represents the current approval state for a Post.

Properties:

- `Guid Id`
- `Guid PostId`
- `ApprovalStatus Status`
- `Guid RequestedByUserId`
- `Guid? ApprovedByUserId`
- `string? RejectionReason`
- `DateTime RequestedAtUtc`
- `DateTime? DecidedAtUtc`

> Each Post has at most one active `PostApproval` record. Historical changes can be captured in ActivityLog (see below).

---

## 2. Domain – Comments

### 2.1 Comment Entity

File: `Collaboration/Comment.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `Guid PostId`
- `Guid? PostVariantId`  (optional: comment can be general to Post or specific to a variant)
- `Guid AuthorUserId`
- `string Body`
- `DateTime CreatedAtUtc`
- `Guid? ParentCommentId` (for threaded replies; can be null)

---

## 3. Domain – Activity Log / Audit

### 3.1 ActivityType Enum

File: `Collaboration/ActivityType.cs`

Values (non-exhaustive, extendable):

- `PostCreated = 1`
- `PostUpdated = 2`
- `PostScheduled = 3`
- `PostPublished = 4`
- `PostFailed = 5`
- `ApprovalRequested = 6`
- `PostApproved = 7`
- `PostRejected = 8`
- `CommentAdded = 9`
- `CommentDeleted = 10`
- `WorkspaceMemberAdded = 11`
- `WorkspaceMemberRemoved = 12`
- (Add more as needed later.)

### 3.2 ActivityLog Entity

File: `Collaboration/ActivityLog.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `ActivityType Type`
- `Guid? PostId`
- `Guid? PostVariantId`
- `Guid? UserId`    (actor)
- `DateTime OccurredAtUtc`
- `string? MetadataJson`  (details; e.g., previous state, new state, error messages)

---

## 4. Domain – Notifications

### 4.1 NotificationType Enum

File: `Collaboration/NotificationType.cs`

Values:

- `ApprovalRequested = 1`
- `PostApproved = 2`
- `PostRejected = 3`
- `PostFailedToPublish = 4`
- `CommentOnMyPost = 5`
- `MentionInComment = 6`
- (Extend as needed.)

### 4.2 Notification Entity

File: `Collaboration/Notification.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `Guid RecipientUserId`
- `NotificationType Type`
- `string Title`
- `string Body`
- `Guid? PostId`
- `Guid? CommentId`
- `bool IsRead`
- `DateTime CreatedAtUtc`
- `DateTime? ReadAtUtc`
- `string? MetadataJson` (e.g., deep links, extra data)

### 4.3 NotificationChannel Enum

We won’t create an entity; channels are handled in service layer:

- `InApp`
- `Email`
- (Slack/Teams can be added later.)

---

## 5. Infrastructure – EF Core Setup

In `AppDbContext`:

Add DbSets:

- `DbSet<PostApproval> PostApprovals { get; set; }`
- `DbSet<Comment> Comments { get; set; }`
- `DbSet<ActivityLog> ActivityLogs { get; set; }`
- `DbSet<Notification> Notifications { get; set; }`

Configure:

- `PostApprovals`:
  - Table: `PostApprovals`.
  - PK: `Id`.
  - Unique index on `PostId`.

- `Comments`:
  - Table: `Comments`.
  - PK: `Id`.
  - Indexes: `(WorkspaceId, PostId)`, `(ParentCommentId)`.

- `ActivityLogs`:
  - Table: `ActivityLogs`.
  - PK: `Id`.
  - Indexes: `(WorkspaceId, OccurredAtUtc)`, `(PostId)`.

- `Notifications`:
  - Table: `Notifications`.
  - PK: `Id`.
  - Index: `(WorkspaceId, RecipientUserId, IsRead)`.

Create migration:

- Name: `Phase10_Collaboration_Approvals_Comments_Notifications`.

Run `dotnet ef database update`.

---

## 6. Application Layer – Approvals Service

In `SocialOrchestrator.Application`:

Create `Collaboration/Dto`:

- `PostApprovalDto`:
  - `Guid PostId`
  - `ApprovalStatus Status`
  - `Guid RequestedByUserId`
  - `Guid? ApprovedByUserId`
  - `string? RejectionReason`
  - `DateTime RequestedAtUtc`
  - `DateTime? DecidedAtUtc`

Interface: `IPostApprovalService`:

Methods:

- `Task<Result<PostApprovalDto>> RequestApprovalAsync(Guid workspaceId, Guid postId, Guid userId);`
- `Task<Result<PostApprovalDto>> ApprovePostAsync(Guid workspaceId, Guid postId, Guid approverUserId);`
- `Task<Result<PostApprovalDto>> RejectPostAsync(Guid workspaceId, Guid postId, Guid approverUserId, string reason);`
- `Task<Result<PostApprovalDto>> GetPostApprovalAsync(Guid workspaceId, Guid postId, Guid userId);`

Implementation (Infrastructure):

- Validate user membership and permissions.
- `RequestApprovalAsync`:
  - Ensure Post belongs to workspace.
  - Create or update `PostApproval` with `Status = Pending`.
  - Log `ActivityLog` with `ActivityType.ApprovalRequested`.
  - Create `Notification` to appropriate approvers (e.g., all Owners/Admins).
- `ApprovePostAsync`:
  - Update `PostApproval` to `Approved`, set `ApprovedByUserId` and `DecidedAtUtc`.
  - Log `ActivityType.PostApproved`.
  - Create `Notification` to `RequestedByUserId`.
- `RejectPostAsync`:
  - Similar to Approve, but `Status = Rejected` and `RejectionReason` filled.
  - Log `PostRejected`.
  - Notify requester.

> Actual enforcement (e.g., only Approved posts can be scheduled/published) should be wired into Phase 3 posting logic with checks on `PostApproval.Status`.

---

## 7. Application Layer – Comments Service

DTOs:

- `CommentDto`:
  - `Guid Id`
  - `Guid WorkspaceId`
  - `Guid PostId`
  - `Guid? PostVariantId`
  - `Guid AuthorUserId`
  - `string Body`
  - `DateTime CreatedAtUtc`
  - `Guid? ParentCommentId`

Interface: `ICommentService`:

Methods:

- `Task<Result<CommentDto>> AddCommentAsync(Guid workspaceId, Guid postId, Guid? postVariantId, Guid authorUserId, string body, Guid? parentCommentId);`
- `Task<Result<IReadOnlyList<CommentDto>>> GetCommentsForPostAsync(Guid workspaceId, Guid postId, Guid userId);`
- `Task<Result> DeleteCommentAsync(Guid workspaceId, Guid commentId, Guid userId);`  
  - (Simple rule: author or Owner/Admin can delete.)

Implementation:

- On add:
  - Validate membership.
  - Create `Comment`.
  - Log `ActivityLog` with `ActivityType.CommentAdded`.
  - Create notifications:
    - To post creator (`CommentOnMyPost`).
    - To mentioned users (if you implement @mentions parsing).

---

## 8. Application Layer – Activity Log Service

DTO:

- `ActivityLogDto`:
  - `Guid Id`
  - `ActivityType Type`
  - `Guid? PostId`
  - `Guid? PostVariantId`
  - `Guid? UserId`
  - `DateTime OccurredAtUtc`
  - `string? MetadataJson`

Interface: `IActivityLogService`:

- `Task<Result<IReadOnlyList<ActivityLogDto>>> GetActivityForWorkspaceAsync(Guid workspaceId, Guid userId, DateTime fromUtc, DateTime toUtc);`
- `Task<Result<IReadOnlyList<ActivityLogDto>>> GetActivityForPostAsync(Guid workspaceId, Guid postId, Guid userId);`

Implementation:

- Simple read-only queries ordered by `OccurredAtUtc`.

Events to log (hook points):

- Post creation/update.
- Scheduling and publishing events (Phase 3).
- Approval actions (this phase).
- Comments (this phase).
- Automation actions (Phase 6).

---

## 9. Application Layer – Notification Service

DTO:

- `NotificationDto`:
  - `Guid Id`
  - `NotificationType Type`
  - `string Title`
  - `string Body`
  - `Guid? PostId`
  - `Guid? CommentId`
  - `bool IsRead`
  - `DateTime CreatedAtUtc`

Interface: `INotificationService`:

- `Task CreateNotificationAsync(Notification notification);`  
  - Internal use by other services.
- `Task<Result<IReadOnlyList<NotificationDto>>> GetNotificationsAsync(Guid workspaceId, Guid userId, bool includeRead, int pageNumber, int pageSize);`
- `Task<Result> MarkAsReadAsync(Guid workspaceId, Guid userId, Guid notificationId);`
- `Task<Result> MarkAllAsReadAsync(Guid workspaceId, Guid userId);`

Email delivery (optional but included in plan):

- Add `INotificationDeliveryService` with methods:
  - `Task SendEmailNotificationAsync(Notification notification);`
- Implementation uses SMTP or a transactional provider (config in `appsettings.json`).

> Backends should call `INotificationService.CreateNotificationAsync` and optionally `INotificationDeliveryService` inside the same transactional boundary or as a separate background job.

---

## 10. API – Collaboration Controllers

In `SocialOrchestrator.Api`:

### 10.1 ApprovalsController

Route: `/api/workspaces/{workspaceId:guid}/posts/{postId:guid}/approval`  
`[Authorize]`.

Endpoints:

- `POST /request` → Request approval.
- `POST /approve` → Approve.
- `POST /reject` (body includes reason).

### 10.2 CommentsController

Route: `/api/workspaces/{workspaceId:guid}/posts/{postId:guid}/comments`  
`[Authorize]`.

Endpoints:

- `GET /` → list comments for post.
- `POST /` → add comment (with optional `postVariantId` and `parentCommentId`).
- `DELETE /{commentId}` → delete comment.

### 10.3 ActivityController

Route: `/api/workspaces/{workspaceId:guid}/activity`  
`[Authorize]`.

Endpoints:

- `GET /` (optional query params `fromUtc`, `toUtc`) → workspace activity.
- `GET /posts/{postId}` → activity for a specific post.

### 10.4 NotificationsController

Route: `/api/workspaces/{workspaceId:guid}/notifications`  
`[Authorize]`.

Endpoints:

- `GET /` → list notifications for current user (with paging).
- `POST /{notificationId}/read` → mark as read.
- `POST /read-all` → mark all as read.

---

## 11. Frontend – Collaboration UI

In Angular:

### 11.1 Approvals

- In `PostDetailComponent`:
  - Show approval status (Pending/Approved/Rejected).
  - Show buttons:
    - “Request approval” (for creators).
    - Approve/Reject (for approvers – Owners/Admins).
  - Show rejection reason if any.

### 11.2 Comments

- Comments section under post detail:
  - List comments threaded (parent/child).
  - Add comment form.
  - Delete button for own comments / admins.
  - Optional: highlight mentions (e.g., `@username`).

### 11.3 Activity

- Workspace-level “Activity” page:
  - List of actions with icons:
    - Created, scheduled, published, failed, comments, approvals.
  - Filters by type, date, user, post.

- Per-post activity timeline in Post detail.

### 11.4 Notifications

- Notification bell in the main header:
  - Badge with unread count.
  - Dropdown listing recent notifications.
  - Click → mark as read and navigate to relevant post/comment.

- Full notifications page:
  - Paginated list with filters (all vs unread).

---

## 12. Manual Verification Checklist (End of Phase 10)

1. **Approvals**:
   - You can request approval on a post.
   - Approvers can approve/reject with reason.
   - Approval status shows correctly in UI.
   - Publishing logic respects approval state if you enforce it (e.g., only approved posts scheduled).

2. **Comments**:
   - You can add, list, and delete comments.
   - Comments are correctly scoped to workspace/post.
   - Activity logs show comment events.

3. **Activity Log**:
   - Events are created for key actions.
   - Activity views show chronological history.

4. **Notifications**:
   - Notifications are created for approval requests, approvals/rejections, comments.
   - In-app notifications appear and can be marked read.
   - Optional email notifications are sent for key events if configured.

---

## 13. Instructions for Automated Coding Agents

- Do not change existing post creation/scheduling semantics; approvals are an additional constraint layer, not a replacement.
- All collaboration features must be scoped by workspace and enforce membership/roles.
- If email delivery is not configured, notifications must still be stored as in-app entries and retrievable.
- Logging and activity tracking must not leak sensitive information in `MetadataJson` (e.g., do not store access tokens there).

This completes the specification for **Phase 10 – Collaboration: Approvals, Comments, Activity & Notifications**.