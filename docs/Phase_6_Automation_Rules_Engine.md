# Phase 6 – Automation & Rules Engine (Ahead-of-Publer Feature)

**Audience:**  
- Solo developer implementing automation logic.  
- Automated coding agents building rules engine and background execution.

**Goal of Phase 6:**  
Add a **rule-based automation engine** that can:

- React to events (e.g., new RSS items, time-based triggers).
- Evaluate conditions on content and analytics.
- Perform actions (e.g., create drafts, schedule posts, send webhooks).

This is a key “ahead-of-Publer” differentiator: a flexible internal rules engine designed for extensibility and later AI integration.

After Phase 6 is completed:

- You can define rules in the database (with UI).
- Background jobs execute those rules at appropriate times.
- Simple use cases work end-to-end, such as:
  - “When there is a new RSS article, create a draft post for selected accounts.”
  - “Every Monday at 9am, create a draft post using a specific template.”

> IMPORTANT FOR CODING AGENTS:  
> - Implement only deterministic rules based on the explicit fields defined here.  
> - Do not introduce AI or LLM calls in this phase (that’s Phase 7).  
> - If rule expressiveness is ambiguous, default to a simpler, explicit design and add TODOs for future extension.

---

## 1. Domain Model – Automation Rules

In `SocialOrchestrator.Domain`:

Create folder: `Automation/`.

### 1.1 RuleTriggerType Enum

File: `Automation/RuleTriggerType.cs`

Values (Phase 6):

- `TimeBased = 1`       (runs on schedule, like cron)
- `RssNewItem = 2`      (new RSS feed entry)
- `AnalyticsThreshold = 3` (e.g., when a post passes some metric threshold – optional stub in this phase)

### 1.2 RuleConditionType Enum

File: `Automation/RuleConditionType.cs`

Values:

- `TextContains = 1`
- `TextNotContains = 2`
- `HashtagContains = 3` (for later use; can map to text now)
- `AccountIs = 4`
- `PostTypeIs = 5`
- `MetricGreaterThan = 6`  (for AnalyticsThreshold trigger)

### 1.3 RuleActionType Enum

File: `Automation/RuleActionType.cs`

Values:

- `CreateDraftPost = 1`
- `SchedulePostAtTime = 2`
- `SendWebhook = 3`
- (Additional actions to be added later.)

### 1.4 AutomationRule Entity

File: `Automation/AutomationRule.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `string Name`
- `bool IsEnabled`
- `RuleTriggerType TriggerType`
- `string TriggerConfigJson`  
  - JSON-encoded configuration specific to the trigger type.
- `string ConditionsJson`  
  - JSON-encoded list of conditions.
- `string ActionsJson`  
  - JSON-encoded list of actions.
- `DateTime CreatedAt`
- `Guid CreatedByUserId`
- `DateTime? LastRunAtUtc`
- `bool IsSystemRule`  
  - For internal rules; user-defined rules have `false`.

> We use JSON-encoded config/conditions/actions to avoid over-normalization and to stay flexible, which is important for a solo dev.

### 1.5 AutomationRun Entity

File: `Automation/AutomationRun.cs`

Properties:

- `Guid Id`
- `Guid AutomationRuleId`
- `DateTime TriggeredAtUtc`
- `bool IsSuccess`
- `string? ErrorMessage`
- `string? InputContextJson`  
  - The data the rule was evaluated on (e.g., RSS item).
- `string? OutputContextJson`  
  - Summary of what actions were taken (e.g., created Post IDs).

---

## 2. Infrastructure – EF Core for Automation

In `SocialOrchestrator.Infrastructure`:

### 2.1 DbSet

Add to `AppDbContext`:

- `DbSet<AutomationRule> AutomationRules { get; set; }`
- `DbSet<AutomationRun> AutomationRuns { get; set; }`

### 2.2 Entity Configuration

Configure `AutomationRule`:

- Table name: `AutomationRules`.
- Primary key: `Id`.
- Index on `WorkspaceId`.
- Required fields: `WorkspaceId`, `Name`, `TriggerType`, `TriggerConfigJson`, `ConditionsJson`, `ActionsJson`, `CreatedAt`, `CreatedByUserId`.

Configure `AutomationRun`:

- Table name: `AutomationRuns`.
- Primary key: `Id`.
- Index on `AutomationRuleId`.
- Required: `AutomationRuleId`, `TriggeredAtUtc`, `IsSuccess`.

### 2.3 Migration

Create migration:

- Name: `Phase6_AutomationRules`.

Run:

- `dotnet ef migrations add Phase6_AutomationRules`
- `dotnet ef database update`.

---

## 3. Application Layer – Automation DTOs & Interfaces

In `SocialOrchestrator.Application`:

Create folder: `Automation/Dto`.

### 3.1 DTOs

- `AutomationRuleSummaryDto`:
  - `Guid Id`
  - `string Name`
  - `bool IsEnabled`
  - `RuleTriggerType TriggerType`
  - `DateTime CreatedAt`
  - `DateTime? LastRunAtUtc`

- `AutomationRuleDetailDto`:
  - `Guid Id`
  - `Guid WorkspaceId`
  - `string Name`
  - `bool IsEnabled`
  - `RuleTriggerType TriggerType`
  - `string TriggerConfigJson`
  - `string ConditionsJson`
  - `string ActionsJson`
  - `DateTime CreatedAt`
  - `Guid CreatedByUserId`
  - `DateTime? LastRunAtUtc`

- `CreateAutomationRuleRequest`:
  - `string Name`
  - `RuleTriggerType TriggerType`
  - `string TriggerConfigJson`
  - `string ConditionsJson`
  - `string ActionsJson`
  - `bool IsEnabled`

- `UpdateAutomationRuleRequest`:
  - `string Name`
  - `bool IsEnabled`
  - `string TriggerConfigJson`
  - `string ConditionsJson`
  - `string ActionsJson`

- `AutomationRunDto`:
  - `Guid Id`
  - `Guid AutomationRuleId`
  - `DateTime TriggeredAtUtc`
  - `bool IsSuccess`
  - `string? ErrorMessage`
  - `string? InputContextJson`
  - `string? OutputContextJson`

### 3.2 Interfaces

Create `Automation/Services/IAutomationRuleService.cs`:

Methods:

- `Task<Result<IReadOnlyList<AutomationRuleSummaryDto>>> ListRulesAsync(Guid workspaceId, Guid userId);`
- `Task<Result<AutomationRuleDetailDto>> GetRuleAsync(Guid workspaceId, Guid ruleId, Guid userId);`
- `Task<Result<AutomationRuleDetailDto>> CreateRuleAsync(Guid workspaceId, Guid userId, CreateAutomationRuleRequest request);`
- `Task<Result<AutomationRuleDetailDto>> UpdateRuleAsync(Guid workspaceId, Guid ruleId, Guid userId, UpdateAutomationRuleRequest request);`
- `Task<Result> DeleteRuleAsync(Guid workspaceId, Guid ruleId, Guid userId);`

Create `Automation/Services/IAutomationExecutor.cs`:

Methods:

- `Task ExecuteTimeBasedRulesAsync(CancellationToken cancellationToken = default);`
- `Task ExecuteRssRulesAsync(CancellationToken cancellationToken = default);`
- `Task ExecuteAnalyticsThresholdRulesAsync(CancellationToken cancellationToken = default);` (may be stubbed in Phase 6)

> These methods will be called by background jobs.

---

## 4. Infrastructure – AutomationRuleService Implementation

In `SocialOrchestrator.Infrastructure`:

Create folder: `Automation/`.

Class: `AutomationRuleService` implementing `IAutomationRuleService`.

Dependencies:

- `AppDbContext _dbContext`.

Key behaviors:

- Ensure user is a member of the workspace before allowing read/write.
- For now, treat all members as allowed to manage automation; later, you can add role-based restrictions.

Methods:

1. `ListRulesAsync`:
   - Fetch `AutomationRules` by `WorkspaceId`.
   - Map to `AutomationRuleSummaryDto`.

2. `GetRuleAsync`:
   - Fetch rule by `Id` and `WorkspaceId`.
   - Map to `AutomationRuleDetailDto`.

3. `CreateRuleAsync`:
   - Validate fields are non-empty.
   - Create `AutomationRule` with:
     - `WorkspaceId`, `Name`, `IsEnabled`, `TriggerType`, JSON fields, `CreatedAt`, `CreatedByUserId`.
   - Save and return detail DTO.

4. `UpdateRuleAsync`:
   - Fetch rule.
   - Update fields: `Name`, `IsEnabled`, JSON fields.
   - Save and return detail DTO.

5. `DeleteRuleAsync`:
   - Soft delete (optional) or hard delete; for Phase 6, hard delete is simplest.
   - Remove `AutomationRule` and (optionally) `AutomationRuns` associated with it.
   - Save and return success.

Register in DI:

- `services.AddScoped<IAutomationRuleService, AutomationRuleService>();`

---

## 5. Infrastructure – AutomationExecutor Implementation

In `SocialOrchestrator.Infrastructure`:

Create class: `Automation/AutomationExecutor.cs` implementing `IAutomationExecutor`.

Dependencies:

- `AppDbContext _dbContext`
- Existing services:
  - `IPostService` (for creating posts).
  - (Later) `IRssFeedService` or a simple RSS reader.

### 5.1 Trigger Config JSON Shapes (for Phase 6)

To avoid guesswork, define explicit JSON schema for each trigger type.

#### 5.1.1 TimeBased TriggerConfigJson

Shape (stringified JSON):

```json
{
  "CronExpression": "0 9 * * 1"   // example: every Monday at 09:00
}
```

- Use standard cron expression library (or create a minimal implementation).
- For Phase 6, support only:
  - `0 H * * D` patterns (H: hour, D: day-of-week) to keep complexity low.

#### 5.1.2 RssNewItem TriggerConfigJson

```json
{
  "FeedUrl": "https://example.com/rss.xml",
  "FetchIntervalMinutes": 30
}
```

- `FetchIntervalMinutes` is an advisory value. Actual scheduling is controlled by recurring jobs.

#### 5.1.3 AnalyticsThreshold TriggerConfigJson

For Phase 6, define but allow stub:

```json
{
  "MetricType": "Likes",
  "Threshold": 100,
  "LookbackDays": 7
}
```

### 5.2 ConditionsJson Shape

Example (list of condition objects):

```json
[
  {
    "Type": "TextContains",
    "Value": "launch"
  },
  {
    "Type": "PostTypeIs",
    "Value": "Status"
  }
]
```

- Always an array of objects with:
  - `Type` (string matching `RuleConditionType` name).
  - `Value` (string).

### 5.3 ActionsJson Shape

Example:

```json
[
  {
    "Type": "CreateDraftPost",
    "TemplatePostType": "Status",
    "TemplateText": "New article: {{title}} {{url}}",
    "TargetSocialAccountIds": [
      "guid1",
      "guid2"
    ]
  }
]
```

- For Phase 6, implement only `CreateDraftPost` and optionally `SendWebhook`.

---

## 6. Rule Execution Logic

### 6.1 ExecuteTimeBasedRulesAsync

Steps:

1. Query `AutomationRules` where:
   - `IsEnabled = true`.
   - `TriggerType = TimeBased`.

2. For each rule:
   - Parse `TriggerConfigJson.CronExpression`.
   - Determine if the current time matches the cron schedule (approximate check is enough for Phase 6: e.g., run every minute and check if minute/hour/day match).
   - If it matches:
     - Build an empty or generic context (since trigger is time-based).
     - Evaluate conditions **against context** (for TimeBased, conditions may refer only to content templates, so they might always be true at first).
     - If conditions satisfied:
       - Execute actions:
         - `CreateDraftPost`:
           - Use `IPostService.CreatePostWithVariantsAsync` with:
             - `Post` data derived from action template (no external feed here).
           - No scheduling (state remains Draft).
       - Record `AutomationRun`.

> To avoid complexity, TimeBased in Phase 6 can be used primarily for **creating drafts based on static templates**.

### 6.2 ExecuteRssRulesAsync

Steps:

1. Query enabled `AutomationRules` with `TriggerType = RssNewItem`.
2. For each rule:
   - Parse `TriggerConfigJson.FeedUrl`.
   - Fetch RSS feed using a simple HTTP client and RSS parsing library (or minimal XML parsing).
   - Determine new items:
     - Keep a separate table or store last processed publish date in `AutomationRule.TriggerConfigJson` (update it after runs) – to simplify Phase 6, you can track “last processed date” in JSON and update it.
   - For each new item:
     - Build context:
       - `title`, `url`, `summary`, `publishDate`.
     - Evaluate conditions:
       - `TextContains` / `TextNotContains` on title/summary.
       - `HashtagContains` on title (for now).
     - If conditions met:
       - Execute actions:
         - `CreateDraftPost`:
           - Use Post template from action config with token replacement:
             - `{{title}}`, `{{url}}`, `{{summary}}`.
           - Create `Post` and `PostVariants` with `State = Draft`.
       - Record `AutomationRun` with `InputContextJson` containing the RSS item data.

> FOR CODING AGENTS:  
> - If RSS parsing library is not pre-decided, use built-in XML handling and a TODO for robust parsing.  
> - Ensure that the system does not create duplicate posts for the same RSS item (e.g., track processed item IDs in `TriggerConfigJson` or separate table – choose one and document it).

### 6.3 ExecuteAnalyticsThresholdRulesAsync

In Phase 6:

- Implement as placeholder:
  - Log a message.
  - Do not perform real logic unless you also implement minimal threshold checks using existing analytics tables.

---

## 7. Background Job Scheduling

In `SocialOrchestrator.Api` `Program.cs`:

- Register recurring Hangfire jobs:

1. `RecurringJob.AddOrUpdate("automation-timebased", () => automationExecutor.ExecuteTimeBasedRulesAsync(CancellationToken.None), Cron.MinuteInterval(5));`
   - Every 5 minutes, approximate matching for time-based rules.

2. `RecurringJob.AddOrUpdate("automation-rss", () => automationExecutor.ExecuteRssRulesAsync(CancellationToken.None), Cron.MinuteInterval(15));`
   - Every 15 minutes, handle RSS.

3. `RecurringJob.AddOrUpdate("automation-analytics-threshold", () => automationExecutor.ExecuteAnalyticsThresholdRulesAsync(CancellationToken.None), Cron.Hourly());`
   - Placeholder, can be simple.

---

## 8. API – Automation Rules Controller

In `SocialOrchestrator.Api`:

Create `AutomationRulesController`:

- Route: `[Route("api/workspaces/{workspaceId:guid}/automation/rules")]`
- `[Authorize]` on controller.

Endpoints:

1. `GET /api/workspaces/{workspaceId}/automation/rules`
   - Calls `IAutomationRuleService.ListRulesAsync`.

2. `GET /api/workspaces/{workspaceId}/automation/rules/{ruleId}`
   - Calls `IAutomationRuleService.GetRuleAsync`.

3. `POST /api/workspaces/{workspaceId}/automation/rules`
   - Accepts `CreateAutomationRuleRequest`.
   - Calls `CreateRuleAsync`.

4. `PUT /api/workspaces/{workspaceId}/automation/rules/{ruleId}`
   - Accepts `UpdateAutomationRuleRequest`.
   - Calls `UpdateRuleAsync`.

5. `DELETE /api/workspaces/{workspaceId}/automation/rules/{ruleId}`
   - Calls `DeleteRuleAsync`.

> FOR CODING AGENTS:  
> - Do not create separate endpoints for running rules manually; rules run via background jobs.  
> - Ensure workspace membership is validated for all endpoints.

---

## 9. Frontend – Automation Rules UI

In Angular:

### 9.1 Routing

Add to `Analytics/Settings/Automation` area or create a dedicated module:

- `/workspaces/:workspaceId/automation/rules` → `AutomationRuleListComponent`
- `/workspaces/:workspaceId/automation/rules/new` → `AutomationRuleEditorComponent`
- `/workspaces/:workspaceId/automation/rules/:ruleId` → `AutomationRuleEditorComponent` (edit mode)

### 9.2 Angular Service

Create `AutomationApiService`:

Methods:

- `listRules(workspaceId: string)`
- `getRule(workspaceId: string, ruleId: string)`
- `createRule(workspaceId: string, payload: CreateAutomationRuleRequest)`
- `updateRule(workspaceId: string, ruleId: string, payload: UpdateAutomationRuleRequest)`
- `deleteRule(workspaceId: string, ruleId: string)`

### 9.3 Components

1. `AutomationRuleListComponent`:
   - Displays list of rules with:
     - Name, trigger type, enabled flag, last run time.
   - Buttons:
     - “New Rule”
     - Edit
     - Delete

2. `AutomationRuleEditorComponent`:
   - Form fields:
     - Name (text).
     - Trigger type (select).
     - Trigger config JSON (textarea).
     - Conditions JSON (textarea).
     - Actions JSON (textarea).
     - Enabled checkbox.
   - For Phase 6:
     - Keep JSON textareas raw (no complex UI builder).
   - Validate JSON with try/catch on save; show error if invalid.

> This raw JSON approach lets you move fast as a solo dev while still providing a powerful engine.

---

## 10. Manual Verification Checklist (End of Phase 6)

1. **Database**:
   - `AutomationRules` and `AutomationRuns` tables exist and work.
   - Creating/deleting rules works without errors.

2. **API**:
   - You can create, list, update, delete rules via API.
   - Unauthorized users cannot manage rules of other workspaces.

3. **Background Jobs**:
   - Time-based rules job runs every few minutes.
   - RSS rules job runs regularly and:
     - Detects new items.
     - Creates draft posts based on template.
   - AutomationRuns are recorded with success/failure info.

4. **Frontend**:
   - You can define a rule via UI (by entering JSON).
   - You can see rule list and details.
   - You see draft posts being created from RSS rules as time passes.

---

## 11. “Ahead-of-Publer” Angle at Phase 6

At this point, SocialOrchestrator:

- Has an internal **rules engine** that can orchestrate workflows:
  - Content ingestion (RSS).
  - Automated draft creation.
  - Time-based content generation.
- Prepares the ground for:
  - Advanced conditions (e.g., based on analytics).
  - AI-assisted content generation in Phase 7.

---

## 12. Instructions for Automated Coding Agents

- Use exactly the entity and DTO structures described; do not add extra fields unless explicitly required.
- When serializing/deserializing JSON config fields, use a consistent serializer (e.g., `System.Text.Json`) and document/capture exceptions.
- Do not add AI/LLM-related calls; that’s Phase 7.
- If in doubt about the structure of JSON config fields, prefer explicit simple objects as defined above.
- After completing this phase, stop and wait for Phase 7 instructions to add AI capabilities.

This completes the specification for **Phase 6 – Automation & Rules Engine**.