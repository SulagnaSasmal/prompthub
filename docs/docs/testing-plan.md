# PromptHub Testing Plan

This plan covers local, CI, and hosted production validation for PromptHub.

## 1. Test Environments

| Environment | Purpose | URL or command |
|-------------|---------|----------------|
| Backend local | API regression tests | `cd backend && .\.venv\Scripts\python.exe -m pytest tests\ -v` |
| Frontend local | TypeScript, lint, production build | `cd frontend && npm.cmd run lint && npm.cmd run build` |
| Docker local | Full stack parity | `docker compose up --build` |
| Railway production | Hosted smoke and acceptance testing | `https://intelligent-insight-production-95d3.up.railway.app` |
| GitHub Actions | Docs/style PR checks | `.github/workflows/prompthub-docs-check.yml` |

## 2. Automated Regression Tests

Run before every push:

```powershell
cd E:\Prompthub\backend
.\.venv\Scripts\python.exe -m pytest tests\ -v

cd E:\Prompthub\frontend
npm.cmd run lint
npm.cmd run build
```

Required pass criteria:

- All backend tests pass.
- ESLint exits with zero warnings.
- Next.js production build completes.
- `git diff --check` returns no whitespace errors.

## 3. Authentication Tests

| Case | Steps | Expected result |
|------|-------|-----------------|
| Valid login | Sign in as `admin` with seeded password | User lands in app with author, reviewer, approver access |
| Invalid login | Use wrong password | API returns 401 and UI shows a clear error |
| Password reset request | Submit seeded user email | UI says a reset link/token was created without exposing account existence |
| Password reset completion | Use valid token and new password | Old password fails; new password succeeds |
| Reset token reuse | Use same token twice | Second reset fails |
| Rate limit | Submit repeated login/reset attempts | API returns 429 after configured threshold |

## 4. Role and Permission Tests

| Role | Must be able to | Must not be able to |
|------|-----------------|---------------------|
| Consumer | Browse production workflows, run approved workflows, rate outputs | Create workflows, configure webhooks, manage providers |
| Author | Create workflows, create versions, add variables/examples, run drafts | Promote to Production alone |
| Reviewer | Process Review Queue, add tests/evaluations, promote runs to tests | Configure enterprise settings unless also approver |
| Approver | Promote to Production, configure webhooks/providers/security | Approve their own authored version if separation applies |

## 5. Working Library and Runner Tests

| Case | Steps | Expected result |
|------|-------|-----------------|
| Library loads | Open `/library` after login | Workflow cards render with status, risk, quality, run count |
| Filters | Filter by category, task type, status, risk | Results match selected filters |
| Required input block | Open runnable workflow, clear required variable, click Run | API blocks with required-variable message |
| Successful run | Fill source input and run | Output is generated through backend gateway and run is persisted |
| PII block | Use source containing SSN-like text | Run is blocked and audit event is recorded |
| Rating | Select rating tags and save | Field-quality signal updates |
| Promote example | Save run as example | Example appears in workflow examples |
| Promote test | Save run as test | Test case appears for reviewer/approver |
| Exports | Export Markdown, JSON, CSV | Files download with matching extension and run metadata |

## 6. Source Integration Tests

| Source | Test | Expected result |
|--------|------|-----------------|
| Markdown paste | Paste Markdown into source fetch | Content becomes runner input and source reference is recorded |
| Markdown upload | Upload `.md` or `.txt` | File contents load into source input |
| GitHub issue | Fetch public GitHub issue URL | Issue title/body/labels are normalized as read-only source |
| GitHub PR | Fetch public pull request URL | PR metadata and changed file list are returned |
| Jira fallback | Fetch `DOC-123` without Jira env vars | Simulated Jira read-only content is returned |
| Jira live | Configure Jira env vars and fetch real issue key | Jira issue fields, comments, status, labels, fix version return |
| OpenAPI URL | Fetch public OpenAPI URL | Spec text is loaded |
| OpenAPI diff | Compare base/head specs | Added/removed endpoint methods are listed and audited |

## 7. Style Profile Tests

| Case | Steps | Expected result |
|------|-------|-----------------|
| Create profile | Add banned phrase rule | Profile saves with encrypted/no secret leakage |
| Style check | Check text containing banned phrase | Flag includes matched text, severity, and message |
| Attach profile | Attach profile to workflow | Future runs can inject profile |
| GitHub Action | Run action with markdown file and profile ID | PR annotations appear for style flags |

## 8. Review Queue Tests

| Case | Steps | Expected result |
|------|-------|-----------------|
| Queue loads | Open `/review` as reviewer | Items grouped by queue section |
| Advance In Review | Click primary action | Version moves to Testing if requirements pass |
| Return In Review | Click Return | Version moves to Draft |
| Advance Testing | Click primary action | Version moves to Approved only when tests/evaluations pass |
| Ready for Approval | Click primary action as approver | Version moves to Production and webhook delivery is queued |
| Blocked transition | Try to advance incomplete workflow | API returns missing requirements and queue remains accurate |

## 9. Deployment and Webhook Tests

| Case | Steps | Expected result |
|------|-------|-----------------|
| Create endpoint | Add webhook in Admin | Endpoint appears without exposing secret |
| Promote production | Promote approved version | Delivery is created with signed payload |
| Retry failed | Force failed endpoint and retry | Attempt count increments and status updates |
| Replay due | Click replay due | Due deliveries are retried |
| Signature | Verify payload signature | HMAC-SHA256 matches endpoint secret |

## 10. Enterprise Config Tests

| Area | Steps | Expected result |
|------|-------|-----------------|
| Model provider | Save OpenAI/Azure/Anthropic/internal provider | Credentials are encrypted and masked in UI |
| Gateway routing | Run workflow with matching active provider | Gateway selects configured provider or falls back safely |
| Workflow pack | Import pack with source URL/license | Pack is Draft with provenance and license metadata |
| Audit events | Run/export/publish/configure settings | `/audit-events` shows each action |
| Retention policy | Save retention policy | Policy appears in Security page and audit events |
| OIDC/SAML config | Save auth config | Secret is encrypted and masked |

## 11. Production Smoke Test

After each deploy:

1. Open `/library`, `/review`, `/integrations`, `/runs`, `/deployments`, `/audit-events`, `/security`, and `/help`.
2. Sign in as seeded admin.
3. Call authenticated APIs:
   - `/api/v1/integrations`
   - `/api/v1/review-queue`
   - `/api/v1/model-providers`
   - `/api/v1/audit-events`
4. Run one workflow.
5. Export Markdown, JSON, and CSV.
6. Confirm audit events were created.

## 12. Release Exit Criteria

A release is acceptable when:

- Backend tests pass.
- Frontend lint and build pass.
- Production smoke test passes.
- New or changed endpoints have regression coverage.
- Specs and docs reflect Done, Partial, or Pending truthfully.
- No secrets are printed in API responses, logs, or UI.
