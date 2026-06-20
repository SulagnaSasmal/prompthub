# PromptHub v3.0: Governed Writing Infrastructure

**Upgrade Specification**
**Status:** Draft for planning
**Supersedes:** PromptHub v2.0 upgrade direction
**Primary goal:** Turn PromptHub from a governed prompt workspace into a daily writing platform and integration layer for technical writers, reviewers, developers, support teams, and approvers.

---

## 1. Product Direction

PromptHub should become the governed execution layer for documentation and prompt-driven writing workflows.

The product should no longer feel like a place where teams store prompts. It should feel like a place where teams:

- find approved writing workflows,
- run those workflows against real source material,
- evaluate and improve outputs,
- enforce terminology and style,
- publish or export the result,
- and deploy approved prompt changes safely into downstream systems.

The core principle remains:

> Governance should wrap the writing work, not interrupt it.

---

## 2. Core Product Model

### 2.1 Primary Object: Workflow

The user-facing object is **Workflow**, not Prompt.

A Workflow represents a repeatable writing task, for example:

- Generate release notes
- Summarize API changes
- Convert Jira tickets into changelog entries
- Turn support cases into KB articles
- Draft migration guides
- Rewrite documentation for house style
- Review docs for banned terminology
- Summarize GitHub repository activity

A Workflow includes:

- Name
- Purpose
- Task type
- Owner
- Approved model
- Risk level
- Prompt template
- Template variables
- Examples
- Test cases
- Evaluations
- Style profile
- Run history
- Usage analytics
- Approval state
- Deployment webhook state
- Export and publishing destinations

The backend can keep the existing Prompt and Version tables where useful, but UI, documentation, and user-facing APIs should consistently use **Workflow** language.

---

## 3. Information Architecture

### 3.1 Main Navigation

```text
Working Library
Run History
Review Queue
Style Profiles
Integrations
Deployments
Dashboard
Admin
```

### 3.2 Role-Specific Experience

**Technical Writer**

- Lands on Working Library.
- Finds workflows by task type.
- Runs workflows against source content.
- Compares outputs.
- Saves good examples.
- Exports drafts.

**Reviewer**

- Lands on Review Queue.
- Reviews submitted workflow versions.
- Checks examples, tests, evaluations, and field quality.
- Comments on workflow versions and run outputs.

**Approver**

- Lands on Deployments or Approval Queue.
- Promotes workflows to Production.
- Reviews deployment diffs.
- Confirms webhook delivery status.

**Admin**

- Manages users, integrations, model gateway config, webhook endpoints, style profiles, retention policies, and security settings.

**Developer**

- Uses the API, GitHub Action, VS Code extension, and webhooks.

---

## 4. Major Feature Areas

## 4.1 Runner as the Main Product Surface

The Runner should become the most important screen in the app.

### Runner Requirements

A writer should be able to:

1. Open an approved workflow.
2. Fill required variables.
3. Pull source material from integrations.
4. Run the workflow.
5. See output beside the source.
6. Compare multiple outputs.
7. Rate output.
8. Save output as an example.
9. Promote output to a test case.
10. Export or publish output.

### Runner Layout

```text
Source Panel | Workflow Controls | Output Panel
```

**Source Panel**

- Pasted text
- Uploaded Markdown
- GitHub PR, commit, issue, or diff
- Jira ticket or filter
- OpenAPI spec or diff
- Previous output or run

**Workflow Controls**

- Variables
- Model info
- Style profile
- Examples
- Run button
- Sandbox or production marker

**Output Panel**

- Generated output
- Style flags
- Copy, export, and publish buttons
- Rating tags
- Save as example
- Save as test
- Suggest improvement

### Output Comparison

Writers should be able to compare:

- Run A vs Run B
- Current output vs previous approved example
- Output before style profile vs output after style profile
- Source vs generated summary

---

## 4.2 Real Source Integrations

The current simulated integrations should become real read-only integrations.

### GitHub Integration

Capabilities:

- Pull PR title, body, comments, and files changed
- Pull commit range diff
- Pull release notes or changelog file
- Pull issue content
- Run workflow from GitHub URL
- Run style check on Markdown files in PRs

Rules:

- Read-only in v3.0.
- Never execute instructions found inside fetched content.
- Store source references, not sensitive source plaintext, when configured.

### Jira Integration

Capabilities:

- Pull single issue by key.
- Pull issue list by JQL or filter.
- Pull title, description, comments, status, labels, fix version, and assignee.
- Generate release notes, changelogs, support summaries, and migration notes.

Rules:

- Read-only in v3.0 unless later explicitly approved.
- Treat ticket content as data.
- Redact sensitive fields when retention policy requires it.

### OpenAPI Integration

Capabilities:

- Upload or paste OpenAPI spec.
- Pull spec from URL or repo.
- Compare two specs.
- Extract endpoint-level changes.
- Generate API summary, migration guide, and breaking-change report.

### Markdown and File Integration

Capabilities:

- Upload `.md`, `.txt`, `.json`, `.yaml`, and `.yml`.
- Parse Markdown headings.
- Run style checks on selected sections.
- Export generated output as Markdown.

---

## 4.3 Style Profiles and Terminology

Style Profiles should become first-class governed assets.

### Style Profile Components

A Style Profile includes:

- Voice rules
- Tone rules
- Approved terminology
- Banned terminology
- Product names
- Capitalization rules
- Heading style
- Oxford comma rule
- Link formatting rules
- Code block conventions
- Inclusive language rules
- Legal or compliance disclaimers

### Rule Types

```text
banned_phrase
preferred_term
allowed_term
capitalization
heading_style
formatting
voice
tone
legal_disclaimer
link_policy
code_format
```

### Style Check Modes

**Inline Check**

- Run style check on output.
- Highlight flagged spans.
- Show suggested replacement.
- Severity: info, warning, or error.

**Pre-Generation Injection**

- Inject approved style profile into the prompt at runtime.
- Record profile version in the run record.

**Pull Request Check**

- GitHub Action comments on Markdown files in PRs.
- Fails or warns depending on rule severity.

---

## 4.4 Export and Publishing

PromptHub should not trap outputs inside the app.

### Export Targets

- Clipboard
- Markdown file
- JSON
- CSV
- GitHub PR comment
- GitHub committed Markdown file
- Confluence draft page
- Jira comment
- Downloadable run package

### Publishing Rules

v3.0 should support exports, but write-back publishing should be permission-gated.

Default behavior:

- Export allowed for Consumers.
- Write-back publishing allowed only for Authors, Reviewers, or Approvers depending on target.
- Every export and publish action is logged.

---

## 4.5 Review Queue

The Dashboard is too broad. Reviewers need a focused work queue.

### Queue Sections

- Needs Review
- Needs Tests
- Needs Examples
- Failed Governance
- Low Formal Score
- Low Field Quality
- High-Risk Escalated
- Ready for Approval

Each item should show:

- Workflow name
- Version
- Owner
- Risk
- Missing requirements
- Last activity
- Primary action

---

## 4.6 Deployment Center

PromptHub now has webhooks. It needs a deployment view.

### Deployment Center Shows

- Production workflows
- Latest deployed version
- Previous production version
- Diff
- Deployment webhook status
- Failed deliveries
- Manual retry
- Deployment history
- Downstream endpoint names

### Deployment Event

Triggered when:

```text
Approved -> Production
```

Payload includes:

- workflow ID
- version ID
- version number
- prompt template
- variables
- metadata
- risk level
- owner
- style profile version
- previous production version
- unified diff
- timestamp
- actor
- signature

### Security

- HMAC-SHA256 signing
- Secret rotation
- Delivery retry
- Delivery audit log
- Endpoint activation or pause
- Event replay by Approver

---

## 4.7 Plugin and Extension Strategy

PromptHub should become useful outside the web UI.

### GitHub App and GitHub Action

First plugin priority.

Capabilities:

- Run style checks on docs PRs.
- Generate release-note draft from merged PRs.
- Summarize API diffs.
- Comment with workflow output.
- Check whether a workflow version is approved before use.
- Trigger deployment webhook validation.

Example GitHub Action:

```yaml
name: PromptHub Docs Check

on:
  pull_request:
    paths:
      - "docs/**"
      - "openapi/**"

jobs:
  prompthub:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: prompthub/run-workflow@v1
        with:
          workflow: api-summary
          source: openapi/openapi.yaml
          mode: style-check
```

### VS Code Extension

Second plugin priority.

Capabilities:

- Run approved workflows on selected text.
- Style-check Markdown.
- Generate docs section from selected source.
- Save output to PromptHub run history.
- Insert output into file.
- Show approved examples.

### Confluence and Jira Plugin

Third plugin priority.

Capabilities:

- Generate KB articles from Jira tickets.
- Create release notes from Jira filters.
- Draft Confluence pages.
- Link generated output back to PromptHub.

### Browser Extension

Fourth plugin priority.

Capabilities:

- Capture useful prompts from AI chats.
- Run approved workflows on current page content.
- Save generated outputs as examples.

---

## 4.8 Marketplace and Workflow Packs

PromptHub should support importable workflow packs.

### Built-In Packs

- Technical Writing Pack
- Release Notes Pack
- API Documentation Pack
- Support KB Pack
- Compliance Review Pack
- Product Management Pack
- Community Prompt Pack

Each pack includes:

- workflows
- variables
- examples
- tests
- style profile suggestions
- source provenance
- license metadata

### Public Source Handling

When importing from public GitHub prompt libraries:

- store repository URL
- store license
- store imported-at timestamp
- avoid copying content from incompatible licenses
- allow admin review before activation
- mark imported workflows as Draft by default

---

## 4.9 Real Model Gateway

The current gateway is a stub. v3.0 should support real providers.

### Supported Providers

- AWS Bedrock
- Azure OpenAI
- OpenAI API
- Anthropic
- Internal HTTP model endpoint

### Gateway Responsibilities

- Hold credentials server-side.
- Enforce approved model per workflow.
- Apply governance pre-checks.
- Inject style profile.
- Execute model request.
- Apply governance post-checks.
- Persist run.
- Track cost, latency, and token usage.
- Redact sensitive inputs by policy.

### Provider Config

Admins configure:

- provider type
- model name
- endpoint
- region
- credentials
- default timeout
- max tokens
- retention policy
- regulated or private flag

---

## 4.10 Governance and Audit

Governance should cover all new v3 actions.

Audit events should include:

- workflow created
- version created
- variables changed
- examples changed
- test promoted from run
- run executed
- rating submitted
- style profile changed
- source fetched
- output exported
- webhook endpoint changed
- deployment fired
- delivery retried
- password reset requested
- password reset completed

---

## 4.11 Security and Compliance

### Must Add

- Real email reset flow
- SSO, SAML, or OIDC
- Per-workspace user management
- Encrypted secrets for webhooks and model providers
- Token expiration and revocation
- Rate limits on login and reset
- PII redaction policy
- Retention policy per workflow
- Private-source storage controls
- Admin audit export

### Password Reset

Current demo reset token display should be replaced with email delivery.

Production behavior:

1. User enters email.
2. System creates token.
3. Token is emailed.
4. UI never displays token.
5. Token expires in 30 minutes.
6. Token is single use.
7. Reset event is logged.

---

## 5. Data Model Additions

### integration_connections

```text
connection_id UUID PK
provider VARCHAR(30)
name VARCHAR(120)
status VARCHAR(20)
created_by UUID
created_at TIMESTAMP
config_json JSONB
encrypted_secret TEXT
```

### source_references

```text
source_reference_id UUID PK
provider VARCHAR(30)
locator TEXT
content_hash VARCHAR(64)
metadata JSONB
created_at TIMESTAMP
```

### export_events

```text
export_id UUID PK
run_id UUID FK
target_type VARCHAR(30)
target_reference TEXT
exported_by UUID
created_at TIMESTAMP
status VARCHAR(20)
```

### workflow_packs

```text
pack_id UUID PK
name VARCHAR(120)
source_url TEXT
license VARCHAR(80)
imported_by UUID
created_at TIMESTAMP
status VARCHAR(20)
```

### model_providers

```text
provider_id UUID PK
name VARCHAR(120)
provider_type VARCHAR(30)
status VARCHAR(20)
config_json JSONB
encrypted_credentials TEXT
created_by UUID
created_at TIMESTAMP
```

### audit_events

```text
audit_event_id UUID PK
actor_id UUID
event_type VARCHAR(80)
target_type VARCHAR(40)
target_id UUID
payload JSONB
created_at TIMESTAMP
```

---

## 6. API Additions

```text
GET/POST /api/v1/integrations
POST /api/v1/integrations/{provider}/fetch
GET/POST /api/v1/style-profiles
POST /api/v1/style-check
POST /api/v1/runs/{id}/export
GET /api/v1/review-queue
GET /api/v1/deployments
POST /api/v1/deployments/{id}/replay
GET/POST /api/v1/workflow-packs
POST /api/v1/workflow-packs/import
GET/POST /api/v1/model-providers
GET /api/v1/audit-events
GET /api/v1/audit-events/export
```

---

## 7. Implementation Plan

### Phase 1: Product Cleanup and Naming

Goal: Make the app coherent.

- Rename UI language from Prompt to Workflow.
- Keep DB table names if needed.
- Update nav, docs, cards, detail pages.
- Add role-specific entry points.
- Improve unauthenticated states and redirects.
- Replace demo reset token with proper email-backed behavior.

Deliverable: Clear Workflow-centered product.

### Phase 2: Real Integrations

Goal: Let writers use real source material.

Build:

- GitHub read-only integration
- Jira read-only integration
- OpenAPI parser and diff
- Markdown upload and parser

Deliverable: Writer can run workflows from real Jira, GitHub, OpenAPI, and Markdown sources.

### Phase 3: Runner 2.0

Goal: Make the runner the daily writing surface.

Build:

- Source and output split view
- Compare runs
- Output revision history
- Style flags inline
- Export buttons
- Save draft output
- Run from examples

Deliverable: Writer can complete find-run-adapt-improve without leaving the runner.

### Phase 4: Style Profiles 2.0

Goal: Make PromptHub valuable specifically to technical writers.

Build:

- Style rule editor
- Terminology dictionary
- Suggested replacements
- Severity rules
- Style profile versioning
- Style profile approval workflow

Deliverable: Teams can enforce writing standards.

### Phase 5: Review Queue and Deployment Center

Goal: Make governance operational.

Build:

- Reviewer queue
- Approval queue
- Deployment center
- Webhook replay
- Failed delivery retry UI
- Deployment diff view

Deliverable: Reviewers and approvers have focused work surfaces.

### Phase 6: Model Gateway

Goal: Replace the stub with real execution.

Build:

- Provider abstraction
- OpenAI, Azure OpenAI, Bedrock, Anthropic, and internal HTTP support
- Cost, latency, and token tracking
- Admin provider config
- Secret storage
- Redaction hooks

Deliverable: PromptHub can run production workflows against approved models.

### Phase 7: Plugins

Goal: Meet users where they work.

Build first:

- GitHub Action

Build second:

- VS Code extension

Build third:

- Jira and Confluence integration

Deliverable: PromptHub becomes workflow infrastructure, not only a web app.

### Phase 8: Workflow Packs

Goal: Make onboarding useful immediately.

Build:

- Pack import and export
- License metadata
- Admin review
- Community pack
- Built-in technical writing pack

Deliverable: Teams can install useful workflow sets in minutes.

### Phase 9: Security and Enterprise Readiness

Goal: Production trust.

Build:

- SSO, OIDC, or SAML
- Email reset
- Rate limiting
- Audit event expansion
- Secrets encryption
- Retention policies
- Admin audit export

Deliverable: Enterprise-ready governance and security baseline.

---

## 8. Acceptance Criteria

v3.0 is complete when:

1. UI consistently uses Workflow language.
2. A writer can run a workflow from real GitHub source content.
3. A writer can run a workflow from real Jira source content.
4. A writer can run a workflow from OpenAPI diff content.
5. A writer can compare two generated outputs.
6. A writer can export output to Markdown.
7. A Style Profile flags terminology and suggests replacements.
8. A reviewer can process all review items from Review Queue.
9. An approver can inspect deployments and replay failed webhooks.
10. A GitHub Action can run a PromptHub style check on a docs PR.
11. A real model provider can be configured and used through the gateway.
12. All v2 governance features still pass.
13. All new actions appear in audit events.
14. Password reset no longer exposes tokens in the UI.
15. Seeded workflow packs include source provenance and license metadata.

---

## 9. Recommended First Build Slice

The best next implementation slice is:

1. Rename UI from Prompt to Workflow.
2. Add Review Queue.
3. Add real GitHub source fetch.
4. Add Runner split view.
5. Add Markdown export.
6. Add style rule editor.
7. Add GitHub Action MVP.

This slice gives the biggest user-visible improvement without trying to build every enterprise feature at once.

---

## 10. Implementation Status Audit

**Audit date:** June 20, 2026
**Status key:** Done = implemented and testable in the current app. Partial = a usable slice exists, but the full spec is not complete. Pending = not implemented yet.

### 10.1 Product Direction

| Item | Status |
|------|--------|
| Find approved writing workflows | Done |
| Run workflows against source material | Done |
| Evaluate and improve outputs | Done |
| Enforce terminology and style | Done |
| Export result | Done |
| Publish/write back to downstream systems | Partial |
| Deploy approved prompt changes safely through webhooks | Done |

### 10.2 Core Product Model

| Workflow capability | Status |
|---------------------|--------|
| Name, purpose, task type, owner, approved model, risk level | Done |
| Prompt template | Done |
| Template variables | Done |
| Examples | Done |
| Test cases | Done |
| Evaluations | Done |
| Style profile | Done |
| Run history | Done |
| Usage analytics | Done |
| Approval state | Done |
| Deployment webhook state | Done |
| Export destinations | Partial |
| Publishing destinations | Partial |
| Consistent Workflow language across UI/docs/API | Partial |

### 10.3 Information Architecture

| Navigation item | Status |
|-----------------|--------|
| Working Library | Done |
| Run History | Done |
| Review Queue | Done |
| Style Profiles | Done |
| Integrations | Done |
| Deployments | Done |
| Dashboard | Done |
| Admin | Done |
| Help/manual | Done |

### 10.4 Major Feature Areas

| Feature area | Status | Notes |
|--------------|--------|-------|
| Runner as main product surface | Done | Split source/input/result workflow exists on detail page. |
| Output comparison | Done | Version diff and run-to-run output comparison are implemented. |
| GitHub integration | Done | Public read-only fetch for issues, PRs, commits, blobs/raw files, and repo summaries. |
| Jira integration | Done | Jira Cloud issue fetch works when credentials are configured, with simulated fallback otherwise. |
| OpenAPI integration | Done | Pasted specs, public URL pulls, and endpoint/method diff parsing are implemented. |
| Markdown/file integration | Done | Pasted Markdown and `.md`, `.txt`, `.json`, `.yaml`, and `.yml` uploads are supported. |
| Style profiles and terminology | Done | Rule creation, attachment, injection, and style check exist. |
| Pull Request style check | Done |
| Markdown export | Done |
| JSON/CSV export | Done |
| GitHub/Confluence/Jira publishing | Partial |
| Review Queue | Done |
| Deployment Center | Done |
| Plugin and extension strategy | Partial |
| Marketplace and workflow packs | Done | Pack import/export records, source provenance, license metadata, and admin review status are implemented. |
| Real model gateway | Done | Provider configuration and gateway routing exist for OpenAI, Azure OpenAI, Anthropic, internal HTTP, and Bedrock-ready config. |
| Governance and audit expansion | Done | New v3 event types are recorded in `audit_events` for runs, exports, sources, providers, packs, security, and workflow activity. |
| Security and compliance | Partial | Token hiding is configurable, secrets are encrypted, rate limits, retention policies, and OIDC/SAML config records exist; full SSO login handshake still requires IdP integration. |

### 10.5 Data Model Additions

| Model | Status |
|-------|--------|
| `integration_connections` | Done |
| `source_references` | Done |
| `export_events` | Done |
| `workflow_packs` | Done |
| `model_providers` | Done |
| `audit_events` | Done |

### 10.6 API Additions

| Endpoint | Status |
|----------|--------|
| `GET/POST /api/v1/integrations` | Done |
| `POST /api/v1/integrations/{provider}/fetch` | Done |
| `GET/POST /api/v1/style-profiles` | Done |
| `POST /api/v1/style-check` | Done |
| `POST /api/v1/runs/{id}/export` | Done |
| `GET /api/v1/review-queue` | Done |
| `GET /api/v1/deployments` | Done |
| `POST /api/v1/deployments/{id}/replay` | Partial |
| `GET/POST /api/v1/workflow-packs` | Done |
| `POST /api/v1/workflow-packs/import` | Done |
| `GET/POST /api/v1/model-providers` | Done |
| `GET /api/v1/audit-events` | Done |
| `GET /api/v1/audit-events/export` | Done |

### 10.7 Implementation Plan

| Phase | Status |
|-------|--------|
| Phase 1: Product cleanup and naming | Partial |
| Phase 2: Real integrations | Done |
| Phase 3: Runner 2.0 | Partial |
| Phase 4: Style Profiles 2.0 | Partial |
| Phase 5: Review Queue and Deployment Center | Done |
| Phase 6: Model Gateway | Done |
| Phase 7: Plugins | Partial |
| Phase 8: Workflow Packs | Done |
| Phase 9: Security and Enterprise Readiness | Partial |

### 10.8 Acceptance Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | UI consistently uses Workflow language | Partial |
| 2 | Writer can run workflow from real GitHub source content | Done |
| 3 | Writer can run workflow from real Jira source content | Done |
| 4 | Writer can run workflow from OpenAPI diff content | Done |
| 5 | Writer can compare two generated outputs | Done |
| 6 | Writer can export output to Markdown | Done |
| 7 | Style Profile flags terminology and suggests replacements | Done |
| 8 | Reviewer can process all review items from Review Queue | Partial |
| 9 | Approver can inspect deployments and replay failed webhooks | Done |
| 10 | GitHub Action can run style check on docs PR | Done |
| 11 | Real model provider can be configured and used through gateway | Done |
| 12 | All v2 governance features still pass | Done |
| 13 | All new actions appear in audit events | Done |
| 14 | Password reset no longer exposes tokens in UI | Done |
| 15 | Seeded workflow packs include source provenance and license metadata | Done |

### 10.9 Recommended First Build Slice

| Item | Status |
|------|--------|
| Rename UI from Prompt to Workflow | Partial |
| Add Review Queue | Done |
| Add real GitHub source fetch | Done |
| Add Runner split view | Done |
| Add Markdown export | Done |
| Add style rule editor | Done |
| Add GitHub Action MVP | Done |
