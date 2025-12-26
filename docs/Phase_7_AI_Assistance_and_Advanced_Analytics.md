# Phase 7 – AI Assistance & Advanced Analytics (Key “Better than Publer” Features)

**Audience:**  
- Solo developer adding AI-powered and advanced features.  
- Automated coding agents implementing AI-assisted flows.

**Goal of Phase 7:**  
Add **AI-assisted content** and **advanced analytics** capabilities that clearly differentiate SocialOrchestrator from Publer:

- AI-powered caption and hashtag suggestions.
- AI-powered content repurposing (e.g., from RSS/article to multiple social posts).
- AI-assisted “best times to post” recommendations using historical data.
- Basic competitor analytics (tracking competitor accounts and comparing key stats).

This phase assumes Phases 0–6 are implemented and working.

> IMPORTANT FOR CODING AGENTS:  
> - Treat the AI/LLM provider as a configurable external service (e.g., OpenAI, Azure OpenAI) and **do not hard-code a specific vendor** beyond configuration.  
> - All AI calls must be clearly isolated behind interfaces so they can be disabled or mocked.  
> - If prompts or responses are ambiguous, use conservative behavior: never auto-post content produced by AI without human review.

---

## 1. AI Integration – Abstraction

In `SocialOrchestrator.Application`:

Create folder: `AI/`.

### 1.1 AI Request/Response DTOs

File: `AI/Dto/AiCaptionRequest.cs`

Properties:

- `string SourceText`  (e.g., article title/summary).
- `string? Tone`  (e.g., “friendly”, “professional”; may be null).
- `string? LanguageCode` (e.g., “en”, “es”; may be null).
- `int MaxLength` (desired length in characters).

File: `AI/Dto/AiCaptionResponse.cs`

Properties:

- `string Caption`
- `IReadOnlyList<string> Hashtags`  (hashtags without `#` prefix; UI can add prefix)

File: `AI/Dto/AiRepurposeRequest.cs`

Properties:

- `string SourceTitle`
- `string SourceUrl`
- `string SourceSummary`
- `string? Tone`
- `int VariantsCount` (e.g., 3)
- `int MaxCaptionLength`

File: `AI/Dto/AiRepurposeResponse.cs`

Properties:

- `IReadOnlyList<AiRepurposedPost>` `Posts`

`AiRepurposedPost`:

- `string Caption`
- `IReadOnlyList<string> Hashtags`

### 1.2 AI Service Interface

File: `AI/Services/IAiContentService.cs`

Methods:

- `Task<Result<AiCaptionResponse>> GenerateCaptionAsync(AiCaptionRequest request, CancellationToken cancellationToken = default);`
- `Task<Result<AiRepurposeResponse>> RepurposeContentAsync(AiRepurposeRequest request, CancellationToken cancellationToken = default);`

> FOR CODING AGENTS:  
> - Do not implement provider-specific logic here. This interface is provider-agnostic.

---

## 2. Infrastructure – AI Provider Implementation

In `SocialOrchestrator.Infrastructure`:

Create folder: `AI/`.

### 2.1 Configuration

Add section to `appsettings.json`:

```json
"AI": {
  "Provider": "OpenAI",                // or "None" to disable AI
  "ApiKey": "REPLACE_ME",
  "BaseUrl": "https://api.openai.com/v1",
  "Model": "gpt-4.1-mini"
}
```

> This is just an example. You can adapt to any LLM provider; the important part is that configuration is isolated to this section.

### 2.2 AiContentService (Implementation)

Class: `AiContentService` implementing `IAiContentService`.

Responsibilities:

- Check configuration:
  - If `Provider` is `"None"` or `ApiKey` is missing, return `Result.Failure("AI not configured")`.
- Build prompts for:
  - Caption generation.
  - Content repurposing.
- Call external AI API via `HttpClient`:
  - Respect rate limits and timeouts.
- Parse response:
  - Extract caption and hashtags.
  - Ensure:
    - Caption length ≤ MaxLength.
    - No profanity or obviously inappropriate content (basic filtering; add TODO for robust moderation).

> Since full external integration details vary, you may include `TODO` comments where specifics are unknown, but keep the shape of prompts/responses clear.

Register in DI:

- `services.AddScoped<IAiContentService, AiContentService>();`

---

## 3. AI Usage in Application – Post Composer Support

In `SocialOrchestrator.Application`:

Extend `IPostService` or add a new interface.

### 3.1 New Interface: IAiPostHelperService

File: `AI/Services/IAiPostHelperService.cs`

Methods:

- `Task<Result<AiCaptionResponse>> SuggestCaptionForRssItemAsync(Guid workspaceId, Guid userId, string title, string summary, string url, string? tone);`
- `Task<Result<AiRepurposeResponse>> SuggestMultiplePostsFromArticleAsync(Guid workspaceId, Guid userId, string title, string summary, string url, string? tone, int variantsCount);`

Implementation in Infrastructure:

- Class: `AI/AiPostHelperService.cs` implements `IAiPostHelperService`.

Dependencies:

- `IAiContentService` (for actual AI calls).
- `AppDbContext` (for validating workspace membership, optionally for storing AI history later).

Behavior:

1. Validate that user belongs to workspace.
2. Construct `AiCaptionRequest` or `AiRepurposeRequest` from inputs.
3. Call `IAiContentService`.
4. Return the result.

> This ensures AI calls are always workspace/user-aware and can be audited or rate-limited per workspace if needed later.

---

## 4. Advanced Analytics – Competitor Tracking

In `SocialOrchestrator.Domain`:

Create folder: `Competitors/`.

### 4.1 Competitor Entity

File: `Competitors/Competitor.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `SocialNetworkType NetworkType`
- `string ExternalAccountId`
- `string Name`
- `string? Username`
- `bool IsActive`
- `DateTime CreatedAt`
- `Guid CreatedByUserId`

### 4.2 CompetitorMetricsDaily Entity

File: `Competitors/CompetitorMetricsDaily.cs`

Properties:

- `Guid Id`
- `Guid CompetitorId`
- `DateTime Date`
- `int FollowersCount`
- `int PostsCount`
- `int TotalEngagements`

---

## 5. Infrastructure – Competitor Tracking

In `SocialOrchestrator.Infrastructure`:

### 5.1 DbSet and Configuration

Add to `AppDbContext`:

- `DbSet<Competitor> Competitors { get; set; }`
- `DbSet<CompetitorMetricsDaily> CompetitorMetricsDaily { get; set; }`

Configure:

- `Competitor`:
  - Table: `Competitors`.
  - Primary key: `Id`.
  - Index on `WorkspaceId`.
  - Unique index on `(WorkspaceId, NetworkType, ExternalAccountId)`.

- `CompetitorMetricsDaily`:
  - Table: `CompetitorMetricsDaily`.
  - Primary key: `Id`.
  - Unique index on `(CompetitorId, Date)`.

Create migration:

- Name: `Phase7_Competitors`.

Run:

- `dotnet ef migrations add Phase7_Competitors`
- `dotnet ef database update`.

### 5.2 CompetitorService

In `SocialOrchestrator.Application`:

Create `Competitors/Dto` and `Competitors/Services`.

DTOs:

- `CompetitorSummaryDto`:
  - `Guid Id`
  - `SocialNetworkType NetworkType`
  - `string Name`
  - `string? Username`
  - `bool IsActive`

- `CompetitorMetricsSummaryDto`:
  - `Guid CompetitorId`
  - `DateTime From`
  - `DateTime To`
  - `int FollowersStart`
  - `int FollowersEnd`
  - `int PostsCount`
  - `int TotalEngagements`

Interface: `ICompetitorService`:

- `Task<Result<IReadOnlyList<CompetitorSummaryDto>>> ListCompetitorsAsync(Guid workspaceId, Guid userId);`
- `Task<Result<CompetitorSummaryDto>> AddCompetitorAsync(Guid workspaceId, Guid userId, SocialNetworkType networkType, string externalAccountId, string name, string? username);`
- `Task<Result> RemoveCompetitorAsync(Guid workspaceId, Guid userId, Guid competitorId);`
- `Task<Result<CompetitorMetricsSummaryDto>> GetCompetitorMetricsAsync(Guid workspaceId, Guid userId, Guid competitorId, DateTime fromUtc, DateTime toUtc);`

Implementation in `SocialOrchestrator.Infrastructure`:

- `Competitors/CompetitorService.cs` implementing `ICompetitorService`.

> Metric fetching will rely on provider APIs similarly to account analytics. For Phase 7, you can stub or implement partial logic for one provider.

---

## 6. Backend – AI-Enhanced API Endpoints

In `SocialOrchestrator.Api`:

### 6.1 AiContentController

Route: `[Route("api/workspaces/{workspaceId:guid}/ai")]`  
`[Authorize]` on controller.

Endpoints:

1. `POST /api/workspaces/{workspaceId}/ai/suggest-caption`
   - Request body:
     - `title`, `summary`, `url`, `tone`, `maxLength`.
   - Extract `userId` from JWT.
   - Calls `IAiPostHelperService.SuggestCaptionForRssItemAsync`.
   - Returns `AiCaptionResponse`.

2. `POST /api/workspaces/{workspaceId}/ai/repurpose-article`
   - Request body:
     - `title`, `summary`, `url`, `tone`, `variantsCount`, `maxCaptionLength`.
   - Calls `IAiPostHelperService.SuggestMultiplePostsFromArticleAsync`.
   - Returns `AiRepurposeResponse`.

> FOR CODING AGENTS:  
> - These endpoints must **never** auto-create posts; they only return suggestions.  
> - Creation of posts based on AI suggestions is a separate explicit user action.

### 6.2 CompetitorsController

Route: `[Route("api/workspaces/{workspaceId:guid}/competitors")]`  
`[Authorize]`.

Endpoints:

1. `GET /api/workspaces/{workspaceId}/competitors`
   - Calls `ICompetitorService.ListCompetitorsAsync`.

2. `POST /api/workspaces/{workspaceId}/competitors`
   - Request: `{ "networkType": "Facebook", "externalAccountId": "...", "name": "...", "username": "..." }`.
   - Calls `AddCompetitorAsync`.

3. `DELETE /api/workspaces/{workspaceId}/competitors/{competitorId}`
   - Calls `RemoveCompetitorAsync`.

4. `GET /api/workspaces/{workspaceId}/competitors/{competitorId}/metrics`
   - Query: `fromUtc`, `toUtc`.
   - Calls `GetCompetitorMetricsAsync`.

---

## 7. Frontend – AI & Competitors UI

In Angular:

### 7.1 AI Assistance in Post Composer

In `PostComposerComponent`:

- Add “AI Suggest Caption” button:
  - Inputs:
    - Title, optional summary or URL (e.g., from RSS item or manual).
    - Optional tone.
  - On click:
    - Call `POST /api/workspaces/{workspaceId}/ai/suggest-caption`.
    - Populate caption field and hashtags suggestions UI.
- Add “Generate Multiple Variants” (optional):
  - Use `/ai/repurpose-article` endpoint.
  - Show returned variants; allow user to choose which variants to convert into `PostVariants`.

UI guidelines:

- Clearly mark AI suggestions as suggestions; user must confirm or edit before saving.
- Do not auto-apply without user action.

### 7.2 Competitors Module

Add routes:

- `/workspaces/:workspaceId/competitors` → `CompetitorListComponent`
- `/workspaces/:workspaceId/competitors/:competitorId` → `CompetitorDetailComponent`

Components:

1. `CompetitorListComponent`:
   - List competitors with:
     - Network, name, username, active flag.
   - Form to add new competitor:
     - Network type (select).
     - External account id.
     - Name, username.
   - Delete button per competitor.

2. `CompetitorDetailComponent`:
   - Shows metrics summary:
     - Follower change over period.
     - Total posts.
     - Total engagements.
   - Optionally a simple line chart for followers.

Service: `CompetitorApiService`:

- Methods to wrap endpoints from `CompetitorsController`.

---

## 8. Advanced Analytics – AI-Assisted Best Times

This feature is part of the final product (not optional), but it must still be **configurable** via the AI settings (can be disabled at runtime if AI is not available).

- Add a refined “best times” endpoint that:
  - Uses the same `WorkspaceOverviewAnalyticsDto` from Phase 5 as deterministic input.
  - Calls `IAiContentService` with a summary of historical performance and asks for recommended posting windows (e.g., 3–5 best slots) and a short rationale.

- Endpoint:
  - `GET /api/workspaces/{workspaceId}/analytics/best-times/ai`
  - Response:
    - List of suggested time slots (day-of-week, hour-of-day) with natural language explanation.
    - Must also include the underlying deterministic metrics used, so the UI can show both AI suggestions and raw data side by side.

Behavior:

- If AI is disabled (`Provider = "None"` or config flag turned off), this endpoint:
  - Returns a clear error (`"AI_ADVANCED_DISABLED"`) and does not call any external AI API.
- If AI is enabled:
  - It **must not** modify any data; it only reads analytics and returns recommendations.

---

## 9. Manual Verification Checklist (End of Phase 7)

1. **AI Integration**:
   - With valid AI configuration:
     - `POST /api/workspaces/{workspaceId}/ai/suggest-caption` returns a caption and hashtags.
     - `POST /api/workspaces/{workspaceId}/ai/repurpose-article` returns multiple suggested posts.
   - With AI disabled (`Provider = "None"`):
     - Endpoints return a clear error message indicating AI is not configured.

2. **Frontend**:
   - Post composer can call AI to generate caption suggestions.
   - Suggestions populate fields but require manual confirmation before saving.

3. **Competitors**:
   - You can add/remove competitors via UI and API.
   - CompetitorMetricsDaily is populated via background jobs (or stubbed for now).
   - Metrics endpoint returns summary data.

4. **Security & UX**:
   - AI suggestions are never auto-published without user review.
   - All endpoints validate workspace membership and permissions.

---

## 10. “Ahead-of-Publer” Summary at Phase 7

By the end of Phase 7, SocialOrchestrator:

- Offers AI-assisted caption and content generation deeply integrated into workflows.
- Has a rules engine (Phase 6) and analytics (Phase 5) cooperating with AI content to build smarter campaigns.
- Adds competitor tracking and analytics, enabling more strategic planning than basic metric dashboards.

---

## 11. Instructions for Automated Coding Agents

- Keep all AI usage behind `IAiContentService` and `IAiPostHelperService` abstractions.
- Make AI misconfiguration a **graceful failure** (no crashes, just clear error messages).
- Do not send user access tokens or secrets to AI providers.
- Ensure all new endpoints are documented via Swagger (if Swagger is enabled).
- After implementing this phase, any additional “beyond Publer” features should be added in new documents rather than by improvising behavior in code.

This completes the specification for **Phase 7 – AI Assistance & Advanced Analytics**.