# Phase 8 – Advanced Scheduling & Content Types

**Audience:**  
- Solo developer implementing advanced scheduling and post formats.  
- Automated coding agents extending the posting pipeline.

**Goal of Phase 8:**  
Extend the basic posting/scheduling system from Phase 3 with:

- Queue-based scheduling (posting queues/slots per account).  
- Recurring posts.  
- Evergreen / recycling posts.  
- Support for additional content types:
  - Reels, Stories, Shorts, Carousels, Polls, Documents, Articles.  
- Multiple media attachments per PostVariant.  
- Richer calendar UX (drag-and-drop rescheduling, queue view).

All of these features are **mandatory** parts of the product, not “optional future ideas”.

> IMPORTANT FOR CODING AGENTS:  
> - This phase **builds on Phases 3 and 4**. Do not re-implement basic posting; extend it.  
> - If a behavior is not described here or in earlier phases, add a `// TODO` and stop rather than guessing.

---

## 1. Domain Model Extensions – Post Types & Media

In `SocialOrchestrator.Domain` (Posts + Media).

### 1.1 Extend PostType Enum

File: `Posts/PostType.cs`

Add the following values (do not remove or renumber existing ones; append):

- `Reel`
- `Story`
- `Short`
- `Poll`
- `Document`
- `Carousel`
- `Article`

You may represent them as:

```csharp
public enum PostType
{
    Status = 0,
    Link = 1,
    Photo = 2,
    Video = 3,
    Reel = 4,
    Story = 5,
    Short = 6,
    Poll = 7,
    Document = 8,
    Carousel = 9,
    Article = 10
}
```

### 1.2 Multiple Media Attachments

Phase 4 uses `PostVariant.MediaAssetId` (single asset). For multiple media per variant:

- Introduce a **link table**:

File: `Posts/PostVariantMedia.cs`

Properties:

- `Guid Id`
- `Guid PostVariantId`
- `Guid MediaAssetId`
- `int Order` (for ordering within carousels; 0-based)

Rules:

- For non-carousel types:
  - Max number of media items per network constraints (e.g., 1 for some, up to N for others). Validate in Application layer, not Domain.
- For `Carousel` type:
  - `Order` defines the sequence of images.

**Migration strategy:**

- Keep `PostVariant.MediaAssetId` for backward compatibility.  
- For variants with a single `MediaAssetId`, populate a `PostVariantMedia` row with `Order=0`.  
- For new code:
  - Use `PostVariantMedia` exclusively.
  - Treat `MediaAssetId` as deprecated; keep it only to avoid breaking migrations.

---

## 2. Domain Model Extensions – Scheduling & Queues

### 2.1 Queue-Based Scheduling

We will introduce queues and slots per social account.

New entities in `Posts/` (or `Scheduling/` if you prefer):

#### 2.1.1 PostingQueue

`PostingQueue.cs`:

- `Guid Id`
- `Guid WorkspaceId`
- `Guid SocialAccountId`
- `string Name` (e.g., “Default Queue”)
- `bool IsDefault`
- `DateTime CreatedAt`
- `DateTime? UpdatedAt`

#### 2.1.2 QueueSlot

`QueueSlot.cs`:

- `Guid Id`
- `Guid PostingQueueId`
- `DayOfWeek DayOfWeek` (0–6)
- `TimeSpan TimeOfDay`
- `int Position` (for ordering within the day)

Behavior:

- Each queue has a set of slots (e.g., Mon 09:00, Wed 14:00).
- Posts assigned to a queue fill slots in order.

### 2.2 Recurring & Recycling Configuration

To support recurring and evergreen posts, add configuration linked to PostVariant.

#### 2.2.1 RecurringSchedule

`RecurringSchedule.cs`:

- `Guid Id`
- `Guid PostVariantId`
- `string RecurrenceRule`  
  - iCal RRULE or a simplified custom format:
    - Example simple JSON:
      ```json
      { "Frequency": "Weekly", "Interval": 1, "DaysOfWeek": [1,3,5] }
      ```
- `DateTime StartAtUtc`
- `DateTime? EndAtUtc`
- `bool IsActive`

#### 2.2.2 RecyclingConfig

`RecyclingConfig.cs`:

- `Guid Id`
- `Guid PostVariantId`
- `TimeSpan Interval`  (e.g., every 7 days)
- `int? MaxRepeats`    (null = unlimited)
- `int RepeatsSoFar`   (internal counter)
- `bool IsActive`

---

## 3. Infrastructure – EF Core Changes (Phase 8)

In `SocialOrchestrator.Infrastructure.AppDbContext`:

- Add `DbSet<PostingQueue> PostingQueues { get; set; }`
- Add `DbSet<QueueSlot> QueueSlots { get; set; }`
- Add `DbSet<PostVariantMedia> PostVariantMedia { get; set; }`
- Add `DbSet<RecurringSchedule> RecurringSchedules { get; set; }`
- Add `DbSet<RecyclingConfig> RecyclingConfigs { get; set; }`

### 3.1 Configuration

- `PostingQueues`:
  - Table: `PostingQueues`.
  - PK: `Id`.
  - Index: `(WorkspaceId, SocialAccountId)`.
  - Only one `IsDefault = true` per `(WorkspaceId, SocialAccountId)`.

- `QueueSlots`:
  - Table: `QueueSlots`.
  - PK: `Id`.
  - FK: `PostingQueueId` → `PostingQueues.Id`.
  - Unique index: `(PostingQueueId, DayOfWeek, TimeOfDay)`.

- `PostVariantMedia`:
  - Table: `PostVariantMedia`.
  - PK: `Id`.
  - FK: `PostVariantId` → `PostVariants.Id`.
  - FK: `MediaAssetId` → `MediaAssets.Id`.
  - Unique index: `(PostVariantId, MediaAssetId)`.
  - Index: `(PostVariantId, Order)`.

- `RecurringSchedules`:
  - Table: `RecurringSchedules`.
  - PK: `Id`.
  - Unique FK: `PostVariantId` (one recurring config per variant).
  - Required: `RecurrenceRule`, `StartAtUtc`.

- `RecyclingConfigs`:
  - Table: `RecyclingConfigs`.
  - PK: `Id`.
  - Unique FK: `PostVariantId`.
  - Required: `Interval`, `IsActive`.

### 3.2 Migration

Create migration:

- Name: `Phase8_AdvancedSchedulingAndContentTypes`.

Apply with `dotnet ef database update`.

---

## 4. Application Layer – Scheduling Services

In `SocialOrchestrator.Application`:

### 4.1 DTOs

Create `Scheduling/Dto`:

- `CreatePostingQueueRequest`:
  - `Guid SocialAccountId`
  - `string Name`
  - `bool IsDefault`

- `QueueSlotDto`:
  - `Guid Id`
  - `DayOfWeek DayOfWeek`
  - `TimeSpan TimeOfDay`
  - `int Position`

- `PostingQueueDto`:
  - `Guid Id`
  - `Guid SocialAccountId`
  - `string Name`
  - `bool IsDefault`
  - `IReadOnlyList<QueueSlotDto> Slots`

- `RecurringScheduleDto`:
  - `Guid Id`
  - `Guid PostVariantId`
  - `string RecurrenceRule`
  - `DateTime StartAtUtc`
  - `DateTime? EndAtUtc`
  - `bool IsActive`

- `RecyclingConfigDto`:
  - `Guid Id`
  - `Guid PostVariantId`
  - `TimeSpan Interval`
  - `int? MaxRepeats`
  - `int RepeatsSoFar`
  - `bool IsActive`

### 4.2 Interfaces

`Scheduling/Services/IQueueService.cs`:

- `Task<Result<PostingQueueDto>> CreateQueueAsync(Guid workspaceId, Guid userId, CreatePostingQueueRequest request);`
- `Task<Result<IReadOnlyList<PostingQueueDto>>> GetQueuesAsync(Guid workspaceId, Guid userId, Guid socialAccountId);`
- `Task<Result> DeleteQueueAsync(Guid workspaceId, Guid userId, Guid postingQueueId);`
- Methods to add/update/delete `QueueSlot`s.

`Scheduling/Services/IRecurringScheduleService.cs`:

- Methods to create/update/delete recurring schedules for variants.

`Scheduling/Services/IRecyclingService.cs`:

- Methods to create/update/delete recycling configs.

---

## 5. Application Layer – Post Creation Changes

In `IPostService` (Phase 3):

- Extend `CreatePostVariantRequest` to allow:

  - `PostType` values including new ones.
  - For multiple media:
    - Either:
      - `List<Guid> MediaAssetIds`, or
      - Keep `MediaAssetId` + add `MediaAssetIds` list; new code uses list.

**Behavior rules:**

- For `Type = Carousel`, require at least 2 media IDs.
- For `Reel`, `Story`, `Short`, `Video`, ensure media type is video.
- For `Poll`, specify poll options in a new DTO field (e.g., `PollOptions: List<string>`); provider-specific mapping will be in provider layer (Phase 8 requires at least model support).

---

## 6. Background Scheduling Logic – Queues, Recurring, Recycling

In `SocialOrchestrator.Infrastructure`:

### 6.1 Queue-Based Scheduling

When a user chooses “Add to Queue” instead of specifying `ScheduledAt`:

- For each selected SocialAccount:
  - Identify its default `PostingQueue` (or user-selected queue).
  - Determine the next available slot:
    - Use `QueueSlots` sorted by (DayOfWeek, TimeOfDay).
    - Consider existing scheduled variants to find the next open slot.
  - Compute `ScheduledAtUtc` from slot (and workspace TZ).
  - Create `PostVariant` with `State = Scheduled` and that `ScheduledAtUtc`.

### 6.2 Recurring Schedules Job

Add a recurring Hangfire job, e.g., every 15 minutes:

- For each active `RecurringSchedule`:
  - Determine if a new occurrence should be scheduled (based on `RecurrenceRule` and `StartAtUtc/EndAtUtc`).
  - If next occurrence is within a reasonable horizon (e.g., next 24 hours) and not already scheduled:
    - Create a new `PostVariant` (clone of template variant) with `State = Scheduled` at that time.

**Important**:

- Do not modify the original template `PostVariant`; treat it as a template-only variant with `State = Draft` or similar.
- Store link from generated variants back to the template (add `Guid? TemplatePostVariantId` to `PostVariant` if needed).

### 6.3 Recycling Job

Add another recurring job (e.g., hourly):

- For each `RecyclingConfig`:
  - Check `IsActive`.
  - If `MaxRepeats` != null and `RepeatsSoFar >= MaxRepeats`, skip.
  - Determine when last instance of this template variant or its clones was published.
  - If enough time has passed (`Interval`):
    - Create another scheduled variant (clone).
    - Increment `RepeatsSoFar`.

---

## 7. API – Scheduling & Content Type Endpoints

In `SocialOrchestrator.Api`:

### 7.1 QueueController

Route: `/api/workspaces/{workspaceId:guid}/accounts/{socialAccountId:guid}/queues`

Actions:

- `GET` – list queues and slots.
- `POST` – create queue (with name, isDefault).
- `DELETE /{queueId}` – delete queue.
- `POST /{queueId}/slots` – add slot.
- `DELETE /{queueId}/slots/{slotId}` – delete slot.

### 7.2 RecurringSchedulesController

Route: `/api/workspaces/{workspaceId:guid}/posts/variants/{postVariantId:guid}/recurring`

- `POST` – create recurring schedule.
- `PUT` – update.
- `DELETE` – delete.
- `GET` – get current config.

### 7.3 RecyclingController

Similarly for recycling configs.

> FOR CODING AGENTS:  
> - All controllers must validate workspace membership.  
> - Do not implement UI-specific logic in controllers; just data.

---

## 8. Frontend – Advanced Calendar & Composer

In Angular:

### 8.1 Calendar Enhancements

- Use a calendar component (e.g., own implementation or a library) with:
  - Month/Week/Day view.
  - Drag-and-drop:
    - On drop, call an endpoint to update `PostVariant.ScheduledAtUtc`.
    - Keep server as source of truth.

- Additional filters:
  - By PostType (including new ones).
  - By queue vs fixed-time posts.

### 8.2 Post Composer Enhancements

- Allow user to:
  - Choose between:
    - “Schedule at specific time”.
    - “Add to queue”.
    - “Recurring” (show recurrence UI).
    - “Evergreen / recycle” (show config).
  - Select multiple media assets (with ordering) for carousel/album type.
  - Select PostType including Reel, Story, etc.

> Validations must match backend constraints; if backend returns an error (e.g., too many media for a provider), show it directly instead of guessing.

---

## 9. Manual Verification Checklist (End of Phase 8)

1. **DB**:
   - Tables for PostingQueues, QueueSlots, PostVariantMedia, RecurringSchedules, RecyclingConfigs exist and are populated.

2. **Queue Scheduling**:
   - You can define queues and slots per social account.
   - Creating a post “to queue” assigns it a correct next slot.
   - Posts appear at expected times in calendar.

3. **Recurring/Recycle**:
   - You can configure a recurring/recycling post.
   - Over time, new variants are created and scheduled as expected.
   - `RepeatsSoFar` increments, and `MaxRepeats` is honored.

4. **Content Types**:
   - UI allows selecting new PostType values.
   - Backend accepts these types and stores appropriate data.
   - Basic provider support is present or marked with TODOs if not known.

5. **Calendar UI**:
   - Dragging a scheduled post to a new date/time updates its schedule.
   - Queued posts are distinguishable from fixed-time posts.

---

## 10. Instructions for Automated Coding Agents

- Do not change existing behaviors from Phases 3–4; only extend them.
- Keep all new scheduling logic deterministic and auditable (logs where appropriate).
- Where provider-specific limits (e.g., max images in a carousel) are unknown, add `TODO` and enforce conservative limits.
- If implementing partial support for advanced PostTypes on some networks only, document that in comments and return clear errors when unsupported.

This completes the specification for **Phase 8 – Advanced Scheduling & Content Types**.