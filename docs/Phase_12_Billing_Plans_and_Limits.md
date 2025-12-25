# Phase 12 – Billing, Plans, and Usage Limits

**Audience:**  
- Solo developer integrating billing.  
- Automated coding agents implementing Stripe-backed plans and enforcement.

**Goal of Phase 12:**  
Add a full billing system:

- Subscription plans (Free/Pro/Business/Enterprise).  
- Integration with a payment processor (Stripe recommended).  
- Usage tracking and limit enforcement (accounts, posts, automation rules, etc.).  
- Basic billing UI for workspace owners.

This turns SocialOrchestrator into a commercial SaaS-ready product.

> IMPORTANT FOR CODING AGENTS:  
> - Assume Stripe, but isolate billing logic so another provider could be swapped later.  
> - Never store full card details; use Stripe’s customer/charge abstractions only.

---

## 1. Domain – Plans & Subscriptions

In `SocialOrchestrator.Domain`:

Create folder: `Billing/`.

### 1.1 Plan Entity

File: `Billing/Plan.cs`

Properties:

- `Guid Id`
- `string Name` (e.g., “Free”, “Pro”)
- `string ExternalId` (e.g., Stripe price ID)
- `string BillingPeriod` (`"monthly"`, `"yearly"`, etc.)
- `decimal Price` (for display; source of truth is Stripe)
- `bool IsActive`
- `DateTime CreatedAt`

### 1.2 PlanLimit Entity

File: `Billing/PlanLimit.cs`

Represents limits per plan.

Properties:

- `Guid Id`
- `Guid PlanId`
- `string Key` (e.g., `"max_workspaces"`, `"max_social_accounts"`, `"max_scheduled_posts"`)
- `int Value`

### 1.3 Subscription Entity

File: `Billing/Subscription.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `Guid PlanId`
- `string ExternalCustomerId`  (Stripe customer ID)
- `string ExternalSubscriptionId` (Stripe subscription ID)
- `DateTime StartedAtUtc`
- `DateTime? EndsAtUtc`
- `bool IsActive`
- `bool IsTrial`
- `DateTime? TrialEndsAtUtc`

### 1.4 UsageRecord Entity

File: `Billing/UsageRecord.cs`

Properties:

- `Guid Id`
- `Guid WorkspaceId`
- `string MetricKey`  (e.g., `"scheduled_posts_this_month"`)
- `int Value`
- `DateTime PeriodStartUtc`
- `DateTime PeriodEndUtc`

> Usage metrics can be incremented over time and reset each period.

---

## 2. Infrastructure – EF Core for Billing

In `AppDbContext`:

Add DbSets:

- `DbSet<Plan> Plans { get; set; }`
- `DbSet<PlanLimit> PlanLimits { get; set; }`
- `DbSet<Subscription> Subscriptions { get; set; }`
- `DbSet<UsageRecord> UsageRecords { get; set; }`

Configure:

- `Plans`:
  - Table: `Plans`.
  - PK: `Id`.
  - Unique index: `Name`.

- `PlanLimits`:
  - Table: `PlanLimits`.
  - PK: `Id`.
  - Index: `(PlanId, Key)`.

- `Subscriptions`:
  - Table: `Subscriptions`.
  - PK: `Id`.
  - Index: `(WorkspaceId, IsActive)`.

- `UsageRecords`:
  - Table: `UsageRecords`.
  - PK: `Id`.
  - Index: `(WorkspaceId, MetricKey, PeriodStartUtc, PeriodEndUtc)`.

Create migration:

- Name: `Phase12_BillingPlansAndLimits`.
- Run `dotnet ef database update`.

---

## 3. Stripe Integration (or Equivalent)

In `SocialOrchestrator.Infrastructure`:

### 3.1 Configuration

`appsettings.json`:

```json
"Stripe": {
  "ApiKey": "sk_live_...",
  "WebhookSecret": "whsec_...",
  "PublicKey": "pk_live_..."
}
```

> Use test keys in dev. Never commit real keys.

### 3.2 StripeClient Abstraction

Create interface: `IBillingGateway` in Application layer.

Methods:

- `Task<string> CreateCustomerAsync(string email, string workspaceName);`
- `Task<string> CreateSubscriptionAsync(string customerId, string priceId);`
- `Task CancelSubscriptionAsync(string subscriptionId);`

Implementation: `StripeBillingGateway` in Infrastructure, using Stripe.NET (or raw HTTP).

---

## 4. Application Layer – Billing Service

DTOs in `Billing/Dto`:

- `PlanDto`:
  - `Guid Id`
  - `string Name`
  - `string BillingPeriod`
  - `decimal Price`
  - `Dictionary<string, int> Limits`

- `SubscriptionDto`:
  - `Guid WorkspaceId`
  - `PlanDto Plan`
  - `bool IsActive`
  - `bool IsTrial`
  - `DateTime StartedAtUtc`
  - `DateTime? EndsAtUtc`
  - `DateTime? TrialEndsAtUtc`

Interface: `IBillingService`:

Methods:

- `Task<Result<IReadOnlyList<PlanDto>>> GetAvailablePlansAsync();`
- `Task<Result<SubscriptionDto>> GetWorkspaceSubscriptionAsync(Guid workspaceId, Guid userId);`
- `Task<Result> StartSubscriptionAsync(Guid workspaceId, Guid userId, Guid planId, string paymentMethodToken);`
- `Task<Result> CancelSubscriptionAsync(Guid workspaceId, Guid userId);`

Implementation:

- `GetAvailablePlansAsync`:
  - Read Plans + PlanLimits; map to DTOs.
- `StartSubscriptionAsync`:
  - Ensure user is workspace owner.
  - Create Stripe customer (if not existing) via `IBillingGateway.CreateCustomerAsync`.
  - Create subscription via `CreateSubscriptionAsync` (plan.ExternalId).
  - Store Subscription record.
- `CancelSubscriptionAsync`:
  - Cancel Stripe subscription.
  - Mark local Subscription as inactive.

---

## 5. Usage Tracking & Limit Enforcement

### 5.1 Usage Metrics

Define canonical metric keys:

- `"workspaces_per_account"` (if you decide to limit per user)
- `"social_accounts_per_workspace"`
- `"scheduled_posts_per_workspace_per_month"`
- `"automation_rules_per_workspace"`
- `"api_requests_per_workspace_per_period"` (optional)

Use `UsageRecord` to track aggregated usage per period.

### 5.2 Limit Enforcement Service

Interface: `IPlanLimitService`:

- `Task<bool> IsWithinLimitAsync(Guid workspaceId, string metricKey, int amountToAdd);`
- `Task IncrementUsageAsync(Guid workspaceId, string metricKey, int amount);`

Implementation:

- Reads current Subscription → Plan → PlanLimits.
- Looks up relevant `UsageRecord` for current billing period (monthly).
- If current value + `amountToAdd` > limit:
  - Return false.
- Else:
  - Increment usage and return true.

**Integration points:**

- When:
  - Creating social accounts → check `"social_accounts_per_workspace"`.
  - Scheduling posts → check `"scheduled_posts_per_workspace_per_month"`.
  - Creating automation rules → check `"automation_rules_per_workspace"`.

Backend behavior on limit exceeded:

- Return `403 Forbidden` with clear error message (e.g., `"PLAN_LIMIT_EXCEEDED"` and details).

---

## 6. Stripe Webhooks

In `SocialOrchestrator.Api`:

- Create `BillingWebhookController`:

  - Route: `/api/billing/stripe/webhook`  
  - No auth; validate Stripe signature using `WebhookSecret`.

- Handle events:
  - `customer.subscription.created` → mark subscription active.
  - `customer.subscription.updated` → handle plan changes, cancellations.
  - `customer.subscription.deleted` → mark subscription inactive.
  - Optional: `invoice.payment_failed` → set flags or notify workspace owner.

Implementation:

- Parse JSON payload.
- Update `Subscription` records accordingly.

---

## 7. Frontend – Billing UI

In Angular:

### 7.1 Plans Page

For workspace owners:

- List available plans with:
  - Name, price, billing period.
  - Limits table (e.g., accounts, posts/month).
- Current workspace’s plan highlighted.

### 7.2 Subscription Management

- If workspace not subscribed:
  - Show “Choose plan” and start subscription:
    - Call backend to initiate subscription (for simplicity, you can use Stripe Checkout sessions in a redirect flow instead of manual token handling).
- If subscribed:
  - Show current plan, next billing date.
  - Buttons:
    - “Change plan” (optional).
    - “Cancel subscription”.

> Implementation detail: you may use Stripe Checkout instead of direct card data. If so, adjust `IBillingGateway` to create Checkout sessions and rely on webhooks to confirm subscription.

---

## 8. Manual Verification Checklist (End of Phase 12)

1. **Plans**:
   - Plans and limits are defined and visible in UI.
   - Plan limits are read correctly from DB.

2. **Subscriptions**:
   - You can subscribe a workspace to a plan.
   - Subscriptions are activated via Stripe events.
   - Cancelling subscription marks it inactive.

3. **Usage Limits**:
   - When approaching limits:
     - System correctly blocks new accounts/posts/rules.
     - Error messages are clear.
   - Usage counters reset correctly per period.

4. **Security/Compliance**:
   - No card data stored in your DB.
   - Stripe keys are loaded from configuration and not hard-coded.

---

## 9. Instructions for Automated Coding Agents

- Treat billing as optional during local development; you may provide test hooks or mock gateway if Stripe keys are missing.
- Always check plan limits in backend logic for:
  - Social account creation.
  - Scheduling new posts.
  - Creating automation rules.
  - Generating API keys (if you limit these too).
- Never auto-downgrade or delete data when plan changes; only block new usage.

This completes the specification for **Phase 12 – Billing, Plans, and Usage Limits**.