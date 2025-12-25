# Phase 8 – Advanced Scheduling: Queues, Recurring, and Recycling

**Audience:**  
- Solo developer extending scheduling capabilities.  
- Automated coding agents implementing advanced scheduling logic.

**Goal of Phase 8:**  
Upgrade the scheduling system beyond single-run posts to support:

- Queue-based scheduling (slots per account).  
- Recurring posts (repeat patterns).  
- Recycling/evergreen posts (reposting content automatically).  

After Phase 8 is completed:

- Each social account can have **queue slots** (e.g., Mon 09:00, Wed 14:00).  
- Posts can be:
  - Scheduled at exact time (existing behavior).
  - Added to queues (auto-assigned next free slot).
  - Configured as recurring posts (e.g., every Monday 10:00).
  - Configured as recycling posts (repeat until end conditions).

> IMPORTANT FOR CODING AGENTS:  
> - Do not remove or break single-run scheduling from Phase 3.  
> - Add new capabilities in a backward-compatible way.  
> - If a rule is unclear, add a TODO and choose the simplest deterministic behavior.

---

## 1. Domain Model Extensions

In `SocialOrchestrator.Domain` under `Posts/`:

### 1.1 QueueSlot Entity (New)

File: `Posts/QueueSlot.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `Guid SocialAccountId`
- `DayOfWeek DayOfWeek` (enum from `System.DayOfWeek`).
- `TimeSpan TimeOfDay`
- `int Position`  
  - For ordering multiple slots at same time; lowest first.
- `bool IsActive`
- `DateTime CreatedAt`
- `DateTime? UpdatedAt`

### 1.2 SchedulingMode Enum (New)

File: `Posts/SchedulingMode.cs`

Values:

- `ExactTime = 0`
- `QueueSlot = 1`
- `Recurring = 2`
- `Recycling = 3`

### 1.3 PostVariant Extensions

Extend `PostVariant` (from Phase 3):

Add properties:

- `SchedulingMode SchedulingMode` (default `ExactTime` for existing rows).
- `Guid? QueueSlotId` (for QueueSlot mode).
- `string? RecurrenceRule`  
  - RRULE-like string (e.g., `FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=1`).  
- `int? MaxRepetitions` (for recurring/recycling).
- `int RepetitionsCount` (number of times already published).
- `DateTime? RecyclingEndDateUtc`

> NOTE: For safety, treat `MaxRepetitions` and `RecyclingEndDateUtc` as optional; a variant must not recycle forever unless explicitly configured.

---

## 2. Infrastructure – EF Core Changes

In `AppDbContext`:

- Add `DbSet<QueueSlot> QueueSlots { get; set; }`.

### 2.1 Entity Configuration

Configure `QueueSlot`:

- Table: `QueueSlots`.
- PK: `Id`.
- Index on `(WorkspaceId, SocialAccountId, DayOfWeek, TimeOfDay)`.
- Required: `WorkspaceId`, `SocialAccountId`, `DayOfWeek`, `TimeOfDay`, `IsActive`.

Update `PostVariant` mapping:

- Map `SchedulingMode` as int enum.
- Configure `QueueSlotId` as nullable FK to `QueueSlots.Id`.

### 2.2 Migration

Create migration:

- Name: `Phase8_AdvancedScheduling`.

Ensure migration includes:

- New table `QueueSlots`.
- New columns on `PostVariants`:
  - `SchedulingMode`, `QueueSlotId`, `RecurrenceRule`, `MaxRepetitions`, `RepetitionsCount`, `RecyclingEndDateUtc`.

Apply with `dotnet ef database update`.

---

## 3. Application Layer – DTO and Service Changes

In `SocialOrchestrator.Application`:

### 3.1 DTO Changes

Extend `CreatePostVariantRequest` (Phase 3) with:

- `SchedulingMode SchedulingMode` (enum).
- `Guid? QueueSlotId`
- `string? RecurrenceRule`
- `int? MaxRepetitions`
- `DateTime? RecyclingEndDate` (in workspace local time).

Create new DTOs in `Posts/Dto`:

- `QueueSlotDto`:
  - `Guid Id`
  - `Guid SocialAccountId`
  - `DayOfWeek DayOfWeek`
  - `TimeSpan TimeOfDay`
  - `int Position`
  - `bool IsActive`

- `CreateQueueSlotRequest`:
  - `Guid SocialAccountId`
  - `DayOfWeek DayOfWeek`
  - `TimeSpan TimeOfDay`
  - `int Position`

- `UpdateQueueSlotRequest`:
  - Same as create, plus `bool IsActive`.

### 3.2 New Interface: IQueueService

File: `Posts/Services/IQueueService.cs`

Methods:

- `Task<Result<IReadOnlyList<QueueSlotDto>>> GetQueueSlotsAsync(Guid workspaceId, Guid userId, Guid socialAccountId);`
- `Task<Result<QueueSlotDto>> CreateQueueSlotAsync(Guid workspaceId, Guid userId, CreateQueueSlotRequest request);`
- `Task<Result<QueueSlotDto>> UpdateQueueSlotAsync(Guid workspaceId, Guid userId, Guid queueSlotId, UpdateQueueSlotRequest request);`
- `Task<Result> DeleteQueueSlotAsync(Guid workspaceId, Guid userId, Guid queueSlotId);`

Update `IPostService` behavior to be aware of `SchedulingMode`:

- When `SchedulingMode = ExactTime`:
  - Use the existing behavior (Phase 3).
- When `SchedulingMode = QueueSlot`:
  - Do not use `ScheduledAtUtc` from request directly.
  - Instead, compute next run time from selected QueueSlot(s).
- When `SchedulingMode = Recurring` or `Recycling`:
  - Use `RecurrenceRule`, `MaxRepetitions`, and `RecyclingEndDate` to compute initial `ScheduledAtUtc` and subsequent times.

---

## 4. Queue-Based Scheduling Logic

### 4.1 Assigning Next Slot (Creation Time)

When `CreatePostWithVariantsAsync` receives a variant with `SchedulingMode = QueueSlot`:

1. Validate `QueueSlotId` is present and belongs to:
   - The given `workspaceId`.
   - The same `SocialAccountId`.
2. Load the `QueueSlot`.
3. Compute the **next occurrence** of that slot in workspace time zone:
   - If today’s day-of-week and time-of-day is in the future, use today.
   - Else, use the next matching day.
4. Convert to UTC and set `PostVariant.ScheduledAtUtc`.
5. Save and schedule the Hangfire job as usual.

### 4.2 Queue-Level Scheduling (Optional in Phase 8)

For a more advanced queue system:

- Instead of binding a variant to a specific `QueueSlotId`, you can:
  - Allow a variant to specify only `SchedulingMode = QueueSlot` and `SocialAccountId`, no `QueueSlotId`.
  - At scheduling time, pick the earliest available slot among all active slots for that account that isn’t already occupied by another post at that time.

In Phase 8, implement the simpler, **explicit slot** mode first (the one described above). Advanced queue logic can be added in a later refinement.

---

## 5. Recurring and Recycling Logic

### 5.1 Recurring Posts

Definition:

- `SchedulingMode = Recurring`.
- `RecurrenceRule` set (RRULE-like string).
- `MaxRepetitions` optionally set (or unlimited if null).

Execution:

- At initial creation:
  - Compute first occurrence based on `RecurrenceRule` and workspace TZ.
  - Set `ScheduledAtUtc` and schedule job.

- In `IPostPublishingService.PublishPostVariantAsync` (after successful publish):
  - If `SchedulingMode = Recurring`:
    - Increment `RepetitionsCount`.
    - If `MaxRepetitions` is not null and `RepetitionsCount >= MaxRepetitions`:
      - Set `State = Published`, do not reschedule.
      - Return.
    - Else:
      - Compute next occurrence from `RecurrenceRule`.
      - Update `ScheduledAtUtc` to next time.
      - Set `State = Scheduled`.
      - Schedule a new Hangfire job for that time.

> For Phase 8, recurrence calculation can be limited:
> - Support weekly recurrence patterns only (e.g., every N weeks on given weekdays).  
> - If `RecurrenceRule` parsing is complex, implement a helper that supports a subset and add TODO for full RRULE support.

### 5.2 Recycling (Evergreen) Posts

Definition:

- `SchedulingMode = Recycling`.
- `MaxRepetitions` and/or `RecyclingEndDateUtc` configured.
- Behavior: After publishing, post returns to the queue for future republishing.

Execution:

- At initial creation:
  - Treat like a `QueueSlot` or `ExactTime` scheduling (implementation choice):
    - Simplest: require a `QueueSlotId` and reuse queue behavior.
- On publish:
  - Increment `RepetitionsCount`.
  - Check conditions to stop recycling:
    - If `MaxRepetitions` not null and `RepetitionsCount >= MaxRepetitions`:
      - Do not reschedule; set `State = Published` or a special `Expired` state if added.
    - Else if `RecyclingEndDateUtc` not null and `nextTime > RecyclingEndDateUtc`:
      - Do not reschedule.
    - Else:
      - Compute next schedule time (e.g., via queue slot or fixed interval).
      - Set `State = Scheduled` and update `ScheduledAtUtc`.
      - Enqueue new Hangfire job.

> FOR CODING AGENTS:  
> - Keep the first implementation simple: require `QueueSlotId` for recycling posts and always use the same slot.
> - If any part of recurrence/recycling is unclear, add `TODO` and documented assumptions.

---

## 6. API – Queue and Advanced Scheduling Endpoints

In `SocialOrchestrator.Api`:

### 6.1 QueueSlotsController

Route: `[Route("api/workspaces/{workspaceId:guid}/accounts/{socialAccountId:guid}/queueslots")]`  
`[Authorize]`.

Endpoints:

1. `GET`  
   - Returns list of `QueueSlotDto` for given workspace and account.

2. `POST`  
   - Accepts `CreateQueueSlotRequest`.
   - Returns created `QueueSlotDto`.

3. `PUT /{queueSlotId}`  
   - Accepts `UpdateQueueSlotRequest`.
   - Updates time, position, active flag.

4. `DELETE /{queueSlotId}`  
   - Deletes or deactivates the slot.
   - Implementation choice: soft delete (set `IsActive = false`) is safer.

### 6.2 Changes to PostsController

- `POST /api/workspaces/{workspaceId}/posts`  
  - Already accepting `CreatePostWithVariantsRequest`; now the nested `CreatePostVariantRequest` includes:
    - `SchedulingMode`, `QueueSlotId`, `RecurrenceRule`, `MaxRepetitions`, `RecyclingEndDate`.

- Validation rules:
  - If `SchedulingMode = ExactTime`:
    - `ScheduledAt` required; queue/recurrence fields ignored.
  - If `QueueSlot`:
    - `QueueSlotId` required; `ScheduledAt` optional/ignored.
  - If `Recurring`:
    - `RecurrenceRule` required; `ScheduledAt` may represent first occurrence; `QueueSlotId` optional.
  - If `Recycling`:
    - `QueueSlotId` or Recurrence/interval config required (depending on chosen strategy).

---

## 7. Frontend – Advanced Scheduling UI

In Angular:

### 7.1 Queue Management UI

In Social Accounts area:

- On `/workspaces/:workspaceId/social-accounts`:
  - Add a “Manage Queue”/“Posting Schedule” button per account.

New route:

- `/workspaces/:workspaceId/accounts/:socialAccountId/queue` → `QueueManagementComponent`.

`QueueManagementComponent`:

- Fetches and displays queue slots (day-of-week + time).
- Allows:
  - Adding slots (day, time, position).
  - Editing slots (time, active).
  - Deleting slots.

### 7.2 Composer UI Changes

In `PostComposerComponent`:

- For each variant row:
  - Add a `SchedulingMode` dropdown:
    - Exact time
    - Queue slot
    - Recurring
    - Recycling
  - If `Exact time`:
    - Show datetime picker (same as Phase 3).
  - If `Queue slot`:
    - Show dropdown of available queue slots for the chosen account.
  - If `Recurring`:
    - For Phase 8, start with simple recurrence configuration:
      - Frequency: weekly.
      - Interval: every N weeks.
      - Days of week: multi-select.
      - Time of day: time picker.
    - Generate `RecurrenceRule` string based on UI; store in request.
  - If `Recycling`:
    - Reuse queue slot UI + fields for:
      - Max repetitions.
      - End date (optional).

> In Phase 8, UI can be plain forms; visual calendars and preview of recurrence patterns can be added later.

---

## 8. Manual Verification Checklist (End of Phase 8)

1. **Database**:
   - `QueueSlots` table exists.
   - New columns in `PostVariants` are present and mapped.

2. **Queues**:
   - You can create queue slots per account.
   - Queue slots persist and can be edited/deactivated.

3. **Scheduling**:
   - You can create a post with `SchedulingMode = QueueSlot` and see it scheduled to the next slot.
   - Recurring posts generate multiple publish events up to `MaxRepetitions` or end date.
   - Recycling posts are re-scheduled after publish according to configuration.

4. **Publishing**:
   - Existing single-run scheduling still works unchanged.
   - Queue/recurring/recycling do not create duplicate jobs or infinite loops.

5. **UI**:
   - Queue management page is accessible and functional.
   - Composer shows scheduling modes and appropriate inputs.
   - The system behaves predictably when switching modes.

---

## 9. Instructions for Automated Coding Agents

- Do not break existing scheduling semantics from Phase 3; extend them.
- Implement recurrence support only for the subset of patterns described; mark unhandled patterns with TODOs.
- Ensure that all scheduling decisions (next occurrence) are deterministic based on stored configuration.
- Whenever you add or update recurring/recycling logic, carefully document assumptions in code comments and avoid hidden magic.

This completes the specification for **Phase 8 – Advanced Scheduling: Queues, Recurring, and Recycling**.