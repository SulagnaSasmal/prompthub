# PromptHub Production Readiness Specification

**Status:** Draft implementation plan  
**Created:** 2026-06-20  
**Related specs:** PromptHub v2.0 and v3.0 upgrade specifications  
**Primary goal:** Prepare PromptHub for a controlled beta and eventual production publishing by tightening access control, security/privacy posture, operational readiness, and integration setup guidance.

---

## 1. Executive Summary

PromptHub is close to being usable as an internal beta for governed writing workflows. The next step is not more feature breadth. The next step is making the product safer, clearer, and easier to operate.

This readiness plan focuses on four workstreams:

1. Better role-based permissions and visible access rules.
2. Security and privacy review for prompts, outputs, source references, and credentials.
3. Production monitoring, logs, backups, and error reporting.
4. Stronger integration setup docs for GitHub, Jira, OpenAPI, and model providers.

The recommended execution order is intentional: permissions and privacy define what is safe to expose; monitoring makes the system operable; integration docs make it adoptable by teams beyond the builder.

---

## 2. Target Publishing Stage

### 2.1 Recommended Stage

PromptHub should be prepared first for a **controlled beta** with technical writers, documentation managers, product/documentation-adjacent teams, and reviewers.

It should not yet be treated as a broad public SaaS launch until:

- role boundaries are enforced server-side,
- data retention and credential handling are documented,
- production failures are visible,
- backups and restore steps are tested,
- and integration setup is understandable without developer assistance.

### 2.2 Initial Audience

**Technical writers**  
Find approved workflows, run them against source material, export drafts, and rate output quality.

**Documentation managers**  
Monitor workflow adoption, quality scores, review status, owner coverage, and governance risk.

**Authors**  
Create and improve workflows, prompt versions, examples, variables, and test cases.

**Reviewers**  
Check tests, examples, evaluations, governance checks, and missing requirements before approval.

**Approvers**  
Promote reviewed workflow versions to production and monitor deployment delivery status.

**Admins**  
Configure integrations, model providers, retention policies, enterprise auth, webhooks, and security settings.

---

## 3. Workstream A: Role-Based Permissions and Visible Access Rules

### 3.1 Goal

Users should clearly understand what they can do, and the backend should enforce the same rules. The UI may hide or disable unavailable actions, but server-side authorization must be the source of truth.

### 3.2 Role Model

| Role | Intended Access |
| --- | --- |
| Consumer / Writer | Browse approved and production workflows, run workflows, export outputs, rate runs. |
| Author | Create workflows, edit drafts, create versions, manage variables, examples, and comments. |
| Reviewer | Manage test cases, evaluations, governance checks, review queue actions, and comments. |
| Approver | Approve versions, promote to production, and monitor deployment readiness. |
| Admin | Manage users, integrations, webhooks, model providers, retention, auth, and security settings. |

### 3.3 Product Requirements

- Every sensitive backend route must declare required roles.
- Every page with restricted actions must show a visible access summary.
- Disabled actions must explain the missing role.
- API failures for permission issues must return clear `403` responses.
- The UI must not rely on hidden buttons as the only protection.
- Audit events should record permission failures for sensitive operations.

### 3.4 Implementation Tickets

- [x] **RBAC-001: Define central permission matrix**
  - Create a backend permission map for routes/actions.
  - Map roles to capabilities such as `workflow.run`, `workflow.create`, `version.approve`, `security.manage`.
  - Add tests for the permission map itself.

- [x] **RBAC-002: Enforce permissions on prompt/workflow routes**
  - Protect workflow creation, update, version creation, variable edits, examples, comments, and run actions.
  - Ensure consumers can run approved/production workflows but cannot edit them.
  - Add API tests for allowed and denied cases.

- [x] **RBAC-003: Enforce permissions on review and approval routes**
  - Restrict evaluation, test result, governance check, and queue transition actions.
  - Restrict approval and production promotion to approver/admin roles.
  - Add tests for author-only, reviewer-only, and approver-only users.

- [x] **RBAC-004: Enforce admin/security permissions**
  - Restrict integrations, model providers, webhooks, retention policies, enterprise auth, and audit/security pages.
  - Ensure credential-related routes are admin-only.
  - Add tests for consumer, author, reviewer, approver, and admin access.

- [x] **RBAC-005: Add frontend access visibility**
  - Add access badges or panels on pages with restricted actions.
  - Show messages such as `Reviewer role required` or `Admin role required`.
  - Disable unavailable actions with clear tooltips or inline text.

- [x] **RBAC-006: Add permission-denied audit events**
  - Record denied sensitive actions with actor, target, action, and timestamp.
  - Avoid logging raw credentials, source content, or prompt output in denial payloads.

### 3.5 Acceptance Criteria

- [ ] A consumer cannot create, edit, approve, promote, configure integrations, or manage security by API or UI.
- [ ] An author cannot approve or promote workflow versions unless they also have approver/admin role.
- [ ] A reviewer can review but cannot manage admin/security configuration.
- [ ] An approver can promote production versions but cannot manage credentials unless also admin.
- [ ] Admin-only pages clearly state the required role.
- [ ] All denied API operations return `403` with a clear message.

---

## 4. Workstream B: Security and Privacy Review

### 4.1 Goal

PromptHub should make it clear what data is stored, how sensitive it is, how long it is retained, and which data must never be returned or logged.

### 4.2 Data Inventory

| Data Type | Examples | Sensitivity | Required Controls |
| --- | --- | --- | --- |
| Workflow metadata | name, description, tags, risk, owner | Internal | Role-based edit controls, audit trail. |
| Prompt versions | prompt templates, variables, change summaries | Internal / confidential | Version history, access control, audit trail. |
| Run inputs | pasted source material, Jira text, Markdown, OpenAPI content | Potentially confidential | Retention policy, redaction option, controlled exports. |
| Run outputs | generated release notes, summaries, KB articles | Potentially confidential | Retention policy, export auditing, access control. |
| Source references | GitHub URLs, Jira keys, OpenAPI URLs, content hashes | Internal / confidential | Reference-only default, configurable storage. |
| Webhook secrets | HMAC secrets | Secret | Never return raw value, redact in logs. |
| Model provider credentials | API keys, endpoint secrets | Secret | Never return raw value, redact in logs. |
| Enterprise auth credentials | OIDC/SAML client secrets | Secret | Never return raw value, redact in logs. |
| Audit events | actor, target, payload, timestamp | Internal | Payload minimization, no secrets. |

### 4.3 Product Requirements

- Secrets must never be returned from read/list endpoints after save.
- Logs must not contain raw credentials, reset tokens, prompt input payloads, or private source content.
- Retention policies must define how long run data and source references are kept.
- Source storage modes must be clearly explained: reference-only, redacted content, full content.
- Export and publish events must be audited.
- Security page and docs must explain privacy behavior in plain language.

### 4.4 Implementation Tickets

- [x] **SEC-001: Create formal data inventory**
  - Add a docs page listing stored data, sensitivity, retention, and owner.
  - Link the data inventory from the Security page and Help manual.

- [x] **SEC-002: Verify secret redaction across APIs**
  - Test webhooks, model providers, integrations, and enterprise auth list/detail endpoints.
  - Ensure responses return status like `secret saved`, not raw values.
  - Add regression tests.

- [x] **SEC-003: Add log redaction rules**
  - Redact authorization headers, secrets, reset tokens, credentials, and obvious API keys.
  - Confirm backend exception logs do not serialize full request bodies for sensitive routes.

- [x] **SEC-004: Implement or document retention behavior**
  - Define retention behavior for runs, exports, source references, and audit events.
  - If deletion jobs are not implemented yet, document the gap and add a scheduled-task ticket.

- [x] **SEC-005: Add source storage visibility**
  - Show current private source storage mode in Security and Integrations pages.
  - Explain what each mode stores.

- [x] **SEC-006: Add privacy-safe export auditing**
  - Ensure export/publish actions record target type, status, actor, and reference.
  - Avoid storing full exported content in audit payloads.

- [x] **SEC-007: Add security review checklist**
  - Create a repeatable checklist for pre-release security review.
  - Include auth, secrets, logs, data retention, source storage, backups, and third-party integrations.

### 4.5 Acceptance Criteria

- [ ] No credential or secret endpoint returns raw secret values after save.
- [ ] Logs do not expose secrets, reset tokens, raw credentials, or private source content.
- [ ] Security docs explain what PromptHub stores and why.
- [ ] Run/source retention behavior is documented and visible.
- [ ] Export and publish events are auditable without exposing full output content.

---

## 5. Workstream C: Production Monitoring, Logs, Backups, and Error Reporting

### 5.1 Goal

Production operators should be able to tell whether PromptHub is healthy, diagnose failures, and recover from data loss or deployment issues.

### 5.2 Monitoring Targets

- Frontend uptime.
- Backend health.
- Database connectivity.
- API latency.
- API error rate.
- Authentication failures.
- Rate-limit events.
- Failed workflow runs.
- Failed webhook deliveries.
- Failed integration fetches.
- Model provider failures.

### 5.3 Product Requirements

- Add a simple health endpoint suitable for uptime checks.
- Add structured backend request logs with request ID, actor ID where available, route, status, and latency.
- Add error boundaries for frontend route failures.
- Add a production backup and restore runbook.
- Add an admin-visible system health summary later.
- Error messages shown to users should be clear but not leak stack traces or credentials.

### 5.4 Implementation Tickets

- [ ] **OPS-001: Add health endpoint**
  - Add `/api/v1/health`.
  - Return API status, database status, app version/commit where available, and timestamp.
  - Keep response free of secrets and internal connection strings.

- [ ] **OPS-002: Add structured backend logging**
  - Log request method, path, status, latency, request ID, actor ID if authenticated.
  - Add request ID to responses for support/debug correlation.
  - Redact sensitive fields.

- [ ] **OPS-003: Add frontend route error boundaries**
  - Add app-level and key route-level error screens.
  - Show a user-safe message and support/debug ID when available.

- [ ] **OPS-004: Add backend exception handling standard**
  - Normalize unexpected errors into safe responses.
  - Preserve full diagnostic details only in server logs with redaction.

- [ ] **OPS-005: Add backup and restore runbook**
  - Document database backup cadence.
  - Document restore steps.
  - Document how to validate restored data.
  - Include seeded demo restore guidance.

- [ ] **OPS-006: Add production monitoring checklist**
  - Document uptime check target.
  - Document metrics and logs to watch after deployment.
  - Include webhook failure and model provider failure checks.

- [ ] **OPS-007: Add System Health admin section**
  - Show API health, database health, recent failures, failed webhooks, and failed integration fetches.
  - Link to audit events and deployment delivery history.

### 5.5 Acceptance Criteria

- [ ] `/api/v1/health` can be checked without login and does not expose secrets.
- [ ] Backend logs are structured and useful for debugging.
- [ ] User-facing errors do not expose stack traces.
- [ ] Backup and restore steps are documented.
- [ ] Operators can identify failed webhook deliveries and failed workflow runs.

---

## 6. Workstream D: Integration Setup Documentation

### 6.1 Goal

A new admin should be able to configure GitHub, Jira, OpenAPI, and model providers using only the app and docs.

### 6.2 Required Documentation

**GitHub**

- Token or app requirements.
- Repository URL/reference formats.
- Read-only source fetch behavior.
- PR/comment publish behavior.
- Required scopes.
- Troubleshooting examples.

**Jira / Confluence**

- API token requirements.
- Site URL and issue key format.
- Private customer data warning.
- Expected source reference behavior.
- Troubleshooting examples.

**OpenAPI**

- Fetchable URL vs pasted/uploaded spec.
- Base/head diff behavior.
- Supported JSON/YAML expectations.
- Common validation failures.
- How API diffs feed workflow runs.

**Model Providers**

- OpenAI, Azure OpenAI, Anthropic, Bedrock, and internal HTTP gateway setup.
- Required credential fields.
- Endpoint override behavior.
- Fallback behavior when no provider is configured.
- Credential storage expectations.
- Troubleshooting examples.

### 6.3 Implementation Tickets

- [ ] **DOCS-001: Add GitHub integration setup guide**
  - Include setup steps, scopes, examples, and troubleshooting.
  - Link from Integrations page help.

- [ ] **DOCS-002: Add Jira/Confluence integration setup guide**
  - Include API token guidance, issue key examples, and privacy warnings.
  - Link from Integrations page help.

- [ ] **DOCS-003: Add OpenAPI setup and diff guide**
  - Include URL, upload, pasted spec, and diff examples.
  - Link from Integrations page and relevant workflow help.

- [ ] **DOCS-004: Add model provider setup guide**
  - Include OpenAI/Azure/internal gateway examples.
  - Explain fallback behavior and credential handling.
  - Link from Model Providers page help.

- [ ] **DOCS-005: Add in-app setup checklists**
  - Add short checklist blocks to Integrations and Model Providers pages.
  - Keep them operational and compact.

- [ ] **DOCS-006: Add connection test plan**
  - Define expected behavior for future `Test connection` buttons.
  - Include success/failure states and audit behavior.

- [ ] **DOCS-007: Add integration troubleshooting matrix**
  - Cover auth failures, missing scopes, inaccessible URLs, malformed OpenAPI specs, provider timeouts, and rate limits.

### 6.4 Acceptance Criteria

- [ ] A new admin can configure at least one source integration using only the docs.
- [ ] Model provider docs explain credential storage and fallback behavior.
- [ ] Integration pages link to relevant setup docs.
- [ ] Docs include examples and troubleshooting.

---

## 7. Execution Plan

### Phase 1: Access Control Foundation

- [x] RBAC-001
- [x] RBAC-002
- [x] RBAC-003
- [x] RBAC-004
- [x] RBAC-005
- [x] RBAC-006

**Exit criteria:** All sensitive actions have backend permission checks, frontend access visibility, and API tests.

### Phase 2: Security and Privacy Baseline

- [x] SEC-001
- [x] SEC-002
- [x] SEC-003
- [x] SEC-004
- [x] SEC-005
- [x] SEC-006
- [x] SEC-007

**Exit criteria:** Data handling is documented, secrets are redacted, and retention behavior is visible.

### Phase 3: Operational Readiness

- [ ] OPS-001
- [ ] OPS-002
- [ ] OPS-003
- [ ] OPS-004
- [ ] OPS-005
- [ ] OPS-006
- [ ] OPS-007

**Exit criteria:** Production health can be checked, logs are useful, backup/restore is documented, and user-facing errors are safe.

### Phase 4: Integration Enablement

- [ ] DOCS-001
- [ ] DOCS-002
- [ ] DOCS-003
- [ ] DOCS-004
- [ ] DOCS-005
- [ ] DOCS-006
- [ ] DOCS-007

**Exit criteria:** Admins can configure core integrations using docs and in-app guidance.

---

## 8. Release Gate Checklist

Before publishing PromptHub beyond a controlled beta:

- [ ] All RBAC tickets complete.
- [ ] All security/privacy baseline tickets complete.
- [ ] Health endpoint implemented and monitored.
- [ ] Backup and restore runbook written and tested.
- [ ] Error reporting and safe frontend error states implemented.
- [ ] GitHub/Jira/OpenAPI/model provider setup docs published.
- [ ] Demo account and seed data are documented.
- [ ] Production secrets are rotated after any public demo or shared environment exposure.
- [ ] Testing plan updated to include permissions, privacy, monitoring, backup, and integration setup scenarios.

---

## 9. Open Questions

- [ ] Should PromptHub support workspace/team-level isolation before public beta?
- [ ] Should authors be blocked from approving their own workflow by default?
- [ ] Should run inputs be stored by default, redacted by default, or reference-only by default?
- [ ] Which production host owns database backups: Railway, external Postgres provider, or a separate managed backup job?
- [ ] Which error reporting provider should be used for frontend/backend exceptions?
- [ ] Are GitHub/Jira integrations expected to use personal access tokens initially or app-based OAuth later?
