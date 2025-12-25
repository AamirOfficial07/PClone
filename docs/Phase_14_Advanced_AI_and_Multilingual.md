# Phase 14 – Advanced AI: Images, Multilingual, Brand Voice & Insights

**Audience:**  
- Solo developer extending AI capabilities.  
- Automated coding agents adding advanced, but well-scoped AI features.

**Goal of Phase 14:**  
Build on Phase 7 AI features with:

- AI image generation (thumbnails/visuals).  
- Multilingual content generation and translation.  
- Brand voice profiles per workspace.  
- AI-generated analytics insights and summaries.  
- (Optional) In-app AI assistant chat for strategy and content ideas.

These features are part of the product roadmap and explicitly specified here to avoid “future” ambiguity.

> IMPORTANT FOR CODING AGENTS:  
> - Keep AI usage behind interfaces and configuration.  
> - Never auto-publish AI-generated content; always require human confirmation.

---

## 1. Domain – Brand Voice & AI Settings

In `SocialOrchestrator.Domain`:

Extend `WorkspaceSettings` (from Phase 1) with AI-related fields:

- `string? BrandVoiceDescription`  
  - Free-text description of tone/style (e.g., “friendly, concise, using simple language”).
- `string? PreferredLanguageCode`  
  - e.g., `"en"`, `"es"`.
- `string[] SecondaryLanguages` (optional; may be stored as JSON string).

You may create a dedicated `AiSettings` entity if you prefer, but for simplicity, reuse `WorkspaceSettings`.

---

## 2. Application Layer – AI Images

In `SocialOrchestrator.Application.AI`:

Extend the AI DTOs and services from Phase 7.

### 2.1 Image Generation DTOs

Create `AiGenerateImageRequest`:

- `string Prompt`
- `string? Style` (e.g., `"photo"`, `"illustration"`)
- `int Width`
- `int Height`
- `string? LanguageCode` (for any text overlays if applicable)

Create `AiGenerateImageResponse`:

- `string ImageUrl`   (temporary URL from AI provider, or base64 for immediate use)
- `string? AltText`

### 2.2 Interface Extension

Extend `IAiContentService`:

- Add method:

  ```csharp
  Task<Result<AiGenerateImageResponse>> GenerateImageAsync(
      AiGenerateImageRequest request,
      CancellationToken cancellationToken = default);
  ```

Implementation in `AiContentService` (Infrastructure):

- Use the configured AI provider’s image generation endpoint (e.g., OpenAI images, Stable Diffusion API).
- Return a URL or temporary file; for production use, you may:
  - Download and push to `Media` storage (Phase 4).
  - Or require explicit user confirmation before saving.

---

## 3. Application Layer – Multilingual Content

Extend `IAiPostHelperService` (Phase 7):

Add methods:

- `Task<Result<AiCaptionResponse>> TranslateCaptionAsync(AiCaptionRequest request, string targetLanguageCode, CancellationToken cancellationToken = default);`
- `Task<Result<AiRepurposeResponse>> GenerateMultilingualPostsAsync(AiRepurposeRequest request, IReadOnlyList<string> targetLanguageCodes, CancellationToken cancellationToken = default);`

Behavior:

- Use brand voice and preferred language from workspace settings to enrich prompts.
- When generating multilingual variants, produce separate captions/hashtags for each language.

---

## 4. AI-Assisted Analytics Insights

Create `AiAnalyticsInsightRequest`:

- `Guid WorkspaceId`
- `DateTime FromUtc`
- `DateTime ToUtc`
- `string? LanguageCode` (if null, use workspace preferred language)

Create `AiAnalyticsInsightResponse`:

- `string SummaryText`  (e.g., “Your posts with video performed 30% better than last month…”)
- `IReadOnlyList<string> Recommendations`  (list of realistic suggestions)

Interface: `IAiAnalyticsInsightService`:

- `Task<Result<AiAnalyticsInsightResponse>> GenerateWorkspaceInsightsAsync(AiAnalyticsInsightRequest request, CancellationToken cancellationToken = default);`

Implementation:

- Reads aggregated analytics from Phase 5/9 services.
- Builds a structured summary object (numbers, trends).
- Sends a concise prompt to AI model to obtain readable summary and recommendations.

> Ensure prompts **do not leak any secrets**; they only contain numeric metrics and safe text.

---

## 5. Optional – Chat Assistant

Create `IWorkspaceAiChatService`:

- `Task<Result<string>> AskAsync(Guid workspaceId, Guid userId, string message, CancellationToken cancellationToken = default);`

Implementation outline:

- Prompt includes:
  - Workspace high-level metrics (from analytics services).
  - Brand voice description.
  - A clear instruction:  
    - “You are a marketing assistant for SocialOrchestrator. Answer questions about content strategy, posting times, and post ideas. Do not claim to see live user data beyond what is provided.”
- Responses are **not** automatically translated to actions; they are suggestions.

---

## 6. Backend – AI Endpoints (Advanced)

In `SocialOrchestrator.Api`:

Extend existing `AiContentController` or create `AiAdvancedController`.

### 6.1 Image Generation Endpoint

`POST /api/workspaces/{workspaceId:guid}/ai/generate-image`

Request:

- `prompt`, `style`, `width`, `height`, `languageCode?`.

Response:

- `AiGenerateImageResponse`.

Optional: allow user to confirm and save generated image into Media library via a separate endpoint (link with Phase 4).

### 6.2 Multilingual Caption/Posts

`POST /api/workspaces/{workspaceId:guid}/ai/translate-caption`

- Uses `TranslateCaptionAsync`.

`POST /api/workspaces/{workspaceId:guid}/ai/multilingual-posts`

- Uses `GenerateMultilingualPostsAsync`.

### 6.3 Analytics Insights

`GET /api/workspaces/{workspaceId:guid}/ai/analytics-insights?fromUtc=...&toUtc=...&languageCode=...`

- Calls `IAiAnalyticsInsightService.GenerateWorkspaceInsightsAsync`.

### 6.4 Chat Assistant

`POST /api/workspaces/{workspaceId:guid}/ai/chat`

- Body: `{ "message": "..." }`.
- Calls `IWorkspaceAiChatService.AskAsync`.
- Returns a string answer.

> All these endpoints must check workspace membership and respect AI configuration (if AI is disabled, return clear error).

---

## 7. Frontend – Advanced AI UI

In Angular:

### 7.1 In Post Composer

Enhance composer with:

- “Generate Image” button:
  - Opens modal:
    - Prompt, style, size.
  - Shows preview.
  - On “Use image”, uploads it via Media API and attaches to the variant.

- “Translate Caption”:
  - Select target language from workspace’s configured languages.
  - Populate an alternate version (even allow map each language to specific accounts).

### 7.2 Multilingual Workflow

- Add an option: “Generate multilingual variants” in composer:
  - Choose languages.
  - AI returns different captions per language.
  - UI maps them to accounts by language (e.g., Spanish accounts get ES caption).

### 7.3 Analytics Insights

- On workspace analytics page:
  - “Ask AI for insights” button:
    - Calls analytics insights endpoint.
    - Shows textual summary + bullet-point recommendations.

### 7.4 Chat Assistant

- Add “AI Assistant” panel:
  - Simple chat UI:
    - Input box, conversation history (local).
  - Each message sends to backend chat endpoint.
  - Use disclaimers that this is advisory.

---

## 8. Configuration & Safety

- Use `AI` section in `appsettings.json` (Phase 7) to toggle advanced features:

```json
"AI": {
  "Provider": "OpenAI",
  "ApiKey": "REPLACE_ME",
  "BaseUrl": "https://api.openai.com/v1",
  "Model": "gpt-4.1-mini",
  "ImagesModel": "dall-e-3",
  "EnableAdvancedFeatures": true
}
```

- If `EnableAdvancedFeatures = false`, Phase 14 endpoints should:
  - Return error `"AI_ADVANCED_DISABLED"` and not call external APIs.

Safety checks:

- Apply simple filters for obviously unsafe words; add `TODO` for robust moderation.
- Always require user confirmation before turning AI output into scheduled posts.

---

## 9. Manual Verification Checklist (End of Phase 14)

1. **Image Generation**:
   - You can generate images via AI.
   - Generated images can be attached to posts via media library.

2. **Multilingual**:
   - AI translation generates reasonable captions in target languages.
   - Multilingual variants can be mapped to appropriate accounts.

3. **Analytics Insights**:
   - AI insights endpoint returns a concise summary and recommendations based on actual analytics.
   - No sensitive or unrelated data appears in responses.

4. **Chat Assistant**:
   - AI chat returns context-aware marketing advice.
   - It does not claim access to real-time data beyond what you feed it.

5. **Configuration**:
   - Turning off `EnableAdvancedFeatures` disables Phase 14 endpoints gracefully.

---

## 10. Instructions for Automated Coding Agents

- Always treat AI APIs as external dependencies that can fail; handle errors gracefully and return clear messages.
- Never store AI provider keys or secrets in code; read from configuration.
- Never auto-publish AI-generated content; keep the human in control.
- Keep prompt templates in a central place so they can be audited and improved later.

This completes the specification for **Phase 14 – Advanced AI: Images, Multilingual, Brand Voice & Insights**.