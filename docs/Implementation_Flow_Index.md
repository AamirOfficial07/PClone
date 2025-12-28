# Implementation Flow Index – SocialOrchestrator

**Purpose:**  
Define a clear, step-by-step **execution order** for humans and coding agents to implement SocialOrchestrator without making assumptions or skipping necessary steps.

**How to Use This Document:**

- Always start at **Phase 0** and proceed in **numeric order**.  
- Do **not** implement features from a later phase before finishing all mandatory steps in earlier phases.  
- Always apply the rules in `docs/Cross_Cutting_Guidelines.md` alongside the current phase document (security, logging, testing, error handling, etc.).  
- If anything seems unclear in a phase document, add `TODO` comments in the code and/or ask the human owner for clarification; do **not invent behavior**.ow to Use This Document:**

- Always start at **Phase 0** and proceed in **numeric order**.  
- Do **not** implement features from a later phase before finishing all mandatory steps in earlier phases.  
- If anything seems unclear in a phase document, add `TODO` comments in the code and/or ask the human owner for clarification; do **not invent behavior**.

---

## Phase Overview

1. **Phase 0 – Project Setup and Architecture Foundation**  
   Document: `docs/Phase_0_Project_Setup_and_Architecture.md`  
   - Create solution & project structure for backend and frontend.  
   - Configure ASP.NET Core API, EF Core, connection string, minimal health endpoint.  
   - Create Angular shell app and basic layout.  
   - No business features.

2. **Phase 1 – Identity, Authentication, and Workspaces**  
   Document: `docs/Phase_1_Identity_and_Workspaces.md`  
   - Set up ASP.NET Identity with SQL Server.  
   - Implement JWT auth for API.  
   - Implement Workspace and WorkspaceMember entities.  
   - Add APIs and UI for register/login and workspace creation/listing.

3. **Phase 2 – Social Accounts and OAuth Integration**  
   Document: `docs/Phase_2_Social_Accounts_and_OAuth.md`  
   - Define SocialAccount and SocialAuthToken entities.  
   - Implement provider abstraction for OAuth.  
   - Implement one concrete provider end-to-end (recommended: Facebook) and design for more.  
   - Add APIs and UI for connecting/disconnecting social accounts per workspace.

4. **Phase 3 – Posts, Scheduling, and Publishing Pipeline**  
   Document: `docs/Phase_3_Posts_Scheduling_and_Publishing.md`  
   - Define Post and PostVariant entities.  
   - Implement PostService for creating posts and variants with scheduled times.  
   - Integrate Hangfire for scheduled publishing jobs.  
   - Implement publishing service that calls provider(s) via existing abstraction.  
   - Add basic post composer, listing, and detail UI.

5. **Phase 4 – Media Library and Basic Attachments**  
   Document: `docs/Phase_4_Media_Library.md`  
   - Define MediaAsset entity and EF configuration.  
   - Implement local file system storage service (IMediaStorageService).  
   - Implement media upload/list/delete APIs and UI.  
   - Integrate Media picker into Post composer and wire MediaAssetId into PostVariant.

6. **Phase 5 – Analytics Basics and “Best Times to Post”**  
   Document: `docs/Phase_5_Analytics_Basics_and_Best_Times.md`  
   - Define PostAnalyticsDaily and AccountAnalyticsDaily entities.  
   - Implement metrics ingestion background jobs (can be stubbed for providers without details).  
   - Implement IAnalyticsService and analytics APIs (per-post, per-account, workspace overview).  
   - Compute deterministic best-times heatmap from historical performance.  
   - Add analytics UI (summary, post metrics, account metrics, heatmap).

7. **Phase 6 – Automation & Rules Engine (Ahead-of-Publer)**  
   Document: `docs/Phase_6_Automation_Rules_Engine.md`  
   - Define AutomationRule and AutomationRun entities.  
   - Implement generic rules engine with JSON-based triggers, conditions, actions.  
   - Implement IAutomationRuleService and IAutomationExecutor.  
   - Implement time-based and RSS-based rules that create drafts.  
   - Add UI to manage rules via raw JSON (list, create, edit, delete).  

8. **Phase 7 – AI Assistance & Advanced Analytics (Ahead-of-Publer)**  
   Document: `docs/Phase_7_AI_Assistance_and_Advanced_Analytics.md`  
   - Define AI abstraction (IAiContentService, IAiPostHelperService) and DTOs.  
   - Implement provider-agnostic AI service (configurable backend).  
   - Add AI endpoints for caption suggestions and article repurposing.  
   - Integrate AI into Post composer (suggestions, variants).  
   - Add competitor entities, APIs, and UI for competitor tracking and metrics.  
   - Add AI-assisted best-time recommendations on top of deterministic analytics where appropriate.

9. **Phase 8 – Advanced Scheduling & Content Types**  
   Document: `docs/Phase_8_Advanced_Scheduling_and_Content_Types.md`  
   - Add queue-based scheduling (posting queues & slots per account).  
   - Implement recurring and recycling/evergreen posts.  
   - Extend PostType to support reels, stories, shorts, carousels, polls, documents, articles.  
   - Support multiple media attachments per PostVariant.  
   - Enhance calendar UI with drag-and-drop and queue views.

10. **Phase 9 – Deep Analytics: Hashtags, Members, Experiments**  
    Document: `docs/Phase_9_Deep_Analytics_Hashtags_Members_Experiments.md`  
    - Add hashtag entities, usage tracking, and per-hashtag analytics.  
    - Add member analytics (per-creator performance).  
    - Implement A/B experiments and result aggregation.  
    - Extend competitor analytics with comparison views.

11. **Phase 10 – Collaboration: Approvals, Comments, Activity & Notifications**  
    Document: `docs/Phase_10_Collaboration_Approvals_Comments_Notifications.md`  
    - Implement post approval workflows (request/approve/reject).  
    - Add comments on posts and variants.  
    - Add activity log/audit trail for key actions.  
    - Add notification system (in-app and email) for approvals, comments, failures, etc.

12. **Phase 11 – Public API & Integrations (Zapier/Make/Webhooks)**  
    Document: `docs/Phase_11_Public_API_and_Integrations.md`  
    - Implement API keys and scoped access.  
    - Expose versioned public API (`/api/public/v1/`) for posts, accounts, analytics, automation.  
    - Implement webhooks for events (post created/published/failed, automation, media, etc.).  
    - Provide configuration and UI for API keys and webhook subscriptions.

13. **Phase 12 – Billing, Plans, and Usage Limits**  
    Document: `docs/Phase_12_Billing_Plans_and_Limits.md`  
    - Define plans and plan limits.  
    - Integrate with Stripe (or equivalent) for subscriptions.  
    - Track usage metrics per workspace and enforce limits.  
    - Add billing UI for workspace owners.

14. **Phase 13 – Enterprise Features: SSO, Multi-Region, Whitelabel**  
    Document: `docs/Phase_13_Enterprise_Features_SSO_MultiRegion_Whitelabel.md`  
    - Add SSO support (OIDC) for enterprise workspaces.  
    - Introduce region-aware configuration and job execution (multi-region readiness).  
    - Implement whitelabel and theming per workspace, including custom domains.

15. **Phase 14 – Advanced AI: Images, Multilingual, Brand Voice & Insights**  
    Document: `docs/Phase_14_Advanced_AI_and_Multilingual.md`  
    - Add AI image generation integrated with media library.  
    - Add multilingual caption/variant generation and translation flows.  
    - Use brand voice profiles for AI generation.  
    - Add AI-generated analytics insights and optional chat assistant.

---

## Strict Execution Rules for Agents

1. **Do not skip phases.**  
   - You must complete all required tasks in a phase before starting the next one.

2. **Do not backfill earlier phases from later ones.**  
   - For example, do not add AI calls (Phase 7) in Phase 3 code.

3. **Use only specified entities and DTOs.**  
   - If you need new fields or types not mentioned, either:
     - Add a `// TODO` and stop, or
     - Ask the human owner for an extension to the design docs.

4. **No hidden side effects.**  
   - All major behaviors must be traceable back to a design document:
     - If a behavior is not described in any phase doc, do not implement it silently.

5. **Respect boundaries of each phase.**  
   - Phase 0: structure only; no business logic.  
   - Phase 1: auth & workspaces only.  
   - Phase 2: connecting accounts, not publishing.  
   - Phase 3: posting & scheduling, no automation rules yet.  
   - Phase 4: media handling only.  
   - Phase 5: analytics only.  
   - Phase 6: rules engine only.  
   - Phase 7: AI & competitor features.

6. **Error handling & TODOs.**  
   - Prefer explicit TODOs over imagined implementations when requirements are missing.  
   - Example: if provider API URL is unknown, add `// TODO: implement provider API call` and ensure code compiles with stub behavior.

7. **Always keep documentation as source of truth.**  
   - If existing code contradicts the design docs, the docs win.  
   - Raise a discrepancy to the human owner instead of silently following the code.

---

## Minimal Implementation Checklist (High-Level)

When running implementation:

1. Open the relevant phase doc in `docs/`.
2. For each numbered section:
   - Implement steps exactly as described (paths, names, responsibilities).
   - Check off items in the phase’s own checklist (each doc has one).
3. After finishing a phase:
   - Run backend tests/build.
   - Run frontend build and relevant manual tests.
   - Only then proceed to the next phase.

---

## Future Extensions

If you add new phases later (e.g., billing, multi-region, SSO, etc.):

- Create new docs under `docs/Phase_X_*.md`.  
- Update this `Implementation_Flow_Index.md` with:
  - Phase number.
  - One-line summary.
  - Document file name.
  - Dependencies (e.g., “requires Phase 3 and Phase 5”).

---

This index is the **authoritative implementation order**.  
Any human or agent implementing SocialOrchestrator should follow these documents in order and avoid assumptions not grounded in this documentation.