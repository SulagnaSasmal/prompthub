# PromptHub: Enterprise Prompt Management System

**Specification v1.0**
**Author:** Sulagna Sasmal
**Status:** Draft for build
**Last updated:** June 2026

---

## 1. Executive Summary

PromptHub is a centralized prompt management system that brings software engineering discipline to enterprise prompts: version control, ownership, testing, approval workflows, and quality measurement. Think of it as GitHub plus DOCenter for prompts.

Organizations today run hundreds of prompts across teams with no version control, no ownership, no testing, no approval workflow, and no quality measurement. The result is inconsistent AI output, hallucinations, compliance risk, and duplicated effort. PromptHub treats every prompt as a governed asset with a lifecycle, an owner, a version history, and a quality score.

This specification defines the complete system: the prompt asset model, versioning scheme, evaluation framework, approval workflow, testing harness, data model, API surface, dashboard, governance layer, and documentation set.

---

## 2. Problem Statement

### 2.1 Current state

Enterprise teams using LLMs accumulate prompts organically. These prompts live in chat histories, wikis, shared documents, and individual notebooks. There is:

- No version control. Nobody knows which version of a prompt produced which output.
- No ownership. When a prompt fails, nobody is accountable for fixing it.
- No testing. Prompts ship to production use without validation against expected behavior.
- No approval workflow. Anyone can write and use any prompt against any model.
- No quality measurement. Output quality is anecdotal, not measured.

### 2.2 Consequences

- Inconsistent AI outputs across teams and over time.
- Hallucinations reaching customers and regulators undetected.
- Compliance exposure: prompts handling sensitive data with no audit trail.
- Duplicate prompts solving the same problem in slightly different, unreconciled ways.

### 2.3 The solution in one sentence

A central Prompt Library with governance: every prompt is a versioned, owned, tested, scored, and approved asset.

---

## 3. Goals and Non-Goals

### 3.1 Goals

| ID | Goal | Success Measure |
|----|------|----------------|
| G1 | Single source of truth for all enterprise prompts | 100% of production prompts registered in PromptHub |
| G2 | Full version history for every prompt | Every prompt change creates an immutable version record |
| G3 | Measurable prompt quality | Every approved version carries an evaluation score |
| G4 | Enforced approval workflow before production use | No prompt reaches Production status without Reviewer and Approver sign-off |
| G5 | Repeatable prompt testing | Every prompt has a test suite with pass/fail results per version |
| G6 | Governance and risk visibility | PII, compliance, bias, and hallucination checks recorded per version |
| G7 | Executive visibility | Dashboard with library health metrics |

### 3.2 Non-Goals (v1)

- PromptHub does not execute prompts against live LLM APIs in v1. Evaluation scores are entered by reviewers based on documented test runs. Automated execution is a v2 candidate (see Section 14).
- PromptHub is not a prompt marketplace. It serves one organization.
- PromptHub does not replace model governance (model selection, fine-tuning, deployment). It governs the prompt layer only.
- No SSO/SAML integration in v1. Simple role-based authentication is sufficient for the demo.

---

## 4. Users and Roles

Four roles, borrowed directly from documentation governance:

| Role | Responsibilities | Permissions |
|------|-----------------|-------------|
| **Author** | Creates and edits prompts, submits for review, responds to review feedback | Create prompt, create version, edit Draft versions, submit for review |
| **Reviewer** | Tests prompts against test cases, records evaluation scores, requests changes | All Author permissions, plus: run/record test results, score evaluations, approve to Testing, request changes |
| **Approver** | Final sign-off, owns risk acceptance, can retire prompts | All Reviewer permissions, plus: promote to Production, archive/retire, override risk level |
| **Consumer** | Uses approved prompts | Read-only access to Production prompts and their metadata |

A user can hold multiple roles, but a version's Author cannot be its sole Reviewer or Approver. This separation-of-duties rule is enforced at the API level.

---

## 5. Prompt Asset Model

Every prompt is an asset with mandatory metadata. A prompt without complete metadata cannot leave Draft status.

### 5.1 Required metadata fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| Prompt Name | String (unique, max 120 chars) | Human-readable identifier | Release Note Generator |
| Description | Text | What the prompt does and when to use it | Generates customer-facing release notes from feature lists |
| Owner | User reference | Accountable team or individual | Documentation Team |
| Category | Enum | Business area taxonomy (see 5.2) | Documentation |
| Subcategory | Enum | Type within the category | Release Notes |
| Status | Enum | Lifecycle state (see Section 8) | Approved |
| Current Version | Semver string | Latest approved version | 1.2 |
| Target Model | String | Model the prompt is validated against | GPT-5 |
| Created By | User reference | Original author | Sulagna |
| Created Date | Timestamp | Auto-populated | 2026-04-20 |
| Last Updated | Timestamp | Auto-populated on any version change | 2026-06-08 |
| Risk Level | Enum: Low / Medium / High | Drives review depth (see Section 12) | Medium |
| Tags | String array | Free-form discovery tags | Release Notes, SaaS |

### 5.2 Category taxonomy

| Category | Subcategories |
|----------|--------------|
| **Documentation** | Release Notes, What's New, API Summaries, Installation Guide Drafts |
| **Support** | Case Summaries, Escalation Analysis, RCA Generation |
| **Product Management** | Feature Descriptions, User Stories, Acceptance Criteria |
| **Compliance** | Policy Summaries, Risk Analysis |

The taxonomy is administrator-extensible. New categories require Approver role.

### 5.3 Metadata validation rules

- Prompt Name must be unique across the library (case-insensitive).
- Owner must be a registered user or team.
- A prompt cannot be submitted for review while any required field is empty.
- Risk Level defaults to Medium and can only be lowered by an Approver.

---

## 6. Versioning

Versioning is where most prompt management efforts stop at "save a copy." PromptHub goes further: versions are immutable, diffable, and tied to evaluation results.

### 6.1 Version scheme

Semantic versioning adapted for prompts:

- **Major (X.0):** Change in intent, output structure, or target model. Requires full re-evaluation and re-approval.
- **Minor (X.Y):** Refinement that preserves intent. Requires evaluation but can fast-track review at the Approver's discretion for Low risk prompts.

### 6.2 Version record

Each version stores:

| Field | Type |
|-------|------|
| Version Number | Semver string |
| Prompt Text | Full text, immutable once submitted for review |
| Change Summary | One-line description of what changed and why |
| Created By | User reference |
| Created Date | Timestamp |
| Status | Draft / In Review / Testing / Approved / Production / Retired |
| Evaluation Results | Linked evaluation records (Section 7) |
| Test Results | Linked test run records (Section 9) |

### 6.3 Worked example: Release Note Generator

| Version | Prompt Text | Change | Output Quality |
|---------|------------|--------|---------------|
| 1.0 | "Write release notes." | Initial | Poor |
| 1.1 | "Generate release notes using customer-facing language." | Added audience framing | Better |
| 1.2 | "Generate release notes using customer-facing language, grouped by feature category, including upgrade impact." | Added feature grouping and upgrade impact | Excellent |
| 1.3 | (v1.2 text) + "Include SaaS deployment notes where applicable." | Added SaaS support | Excellent |

This change log is exactly how software releases are tracked, and it is the audit trail regulators and quality teams need.

### 6.4 Versioning rules

- Versions are never edited after submission. Corrections create a new version.
- Only one version of a prompt can hold Production status at a time. Promoting a new version automatically moves the previous Production version to Retired.
- Retired versions remain readable forever (audit requirement).
- Side-by-side diff view between any two versions is a required UI feature.

---

## 7. Evaluation Framework

Every prompt version is scored before approval. This is where enterprise AI governance is heading, and it is the system's core differentiator.

### 7.1 Evaluation criteria and weights

| Metric | Weight | What it measures |
|--------|--------|------------------|
| Accuracy | 30% | Factual correctness of output against source input |
| Completeness | 25% | Coverage of all required output elements |
| Tone Consistency | 15% | Adherence to defined voice and audience |
| Hallucination Risk | 20% | Absence of fabricated facts, features, or claims (higher score = lower risk) |
| Formatting | 10% | Structural compliance with the expected output format |

Weights are configurable per category by an Approver, but the five metrics are fixed in v1 to keep scores comparable across the library.

### 7.2 Scoring

- Each metric is scored 1 to 10 by the Reviewer per test run.
- Final score = weighted sum, expressed as a percentage.
- Minimum of 3 test runs per evaluation; the recorded score is the mean.

### 7.3 Example scorecard

**Prompt:** Release Notes Generator v1.3, Test Run #1

| Metric | Score | Weighted |
|--------|-------|----------|
| Accuracy | 9/10 | 27.0 |
| Completeness | 8/10 | 20.0 |
| Tone Consistency | 10/10 | 15.0 |
| Hallucination Risk | 8/10 | 16.0 |
| Formatting | 9/10 | 9.0 |
| **Final Score** | | **87%** |

### 7.4 Score thresholds

| Score | Outcome |
|-------|---------|
| ≥ 85% | Eligible for approval |
| 70 to 84% | Conditional: Approver may approve Low risk prompts with documented rationale |
| < 70% | Rejected, returns to Draft |

High risk prompts require ≥ 90% regardless of category.

---

## 8. Lifecycle and Approval Workflow

### 8.1 States

```
Draft → In Review → Testing → Approved → Production → Retired
```

| State | Meaning | Who can transition out |
|-------|---------|----------------------|
| Draft | Author is writing or revising | Author (submit) |
| In Review | Reviewer is examining prompt design and metadata | Reviewer (advance or return) |
| Testing | Test suite executed, evaluation scored | Reviewer (advance or return) |
| Approved | Evaluation passed, awaiting promotion | Approver (promote or return) |
| Production | Live and consumable | Approver (retire) |
| Retired | Out of service, read-only | None (terminal) |

### 8.2 Transition rules

- Draft → In Review: all required metadata complete; change summary present.
- In Review → Testing: Reviewer confirms prompt design, assigns or confirms test suite.
- Testing → Approved: all test cases pass AND evaluation score meets threshold (Section 7.4).
- Approved → Production: Approver sign-off recorded with timestamp and user identity.
- Any state → Draft: Reviewer or Approver can return with mandatory comments.
- Production → Retired: Approver action, or automatic on promotion of a successor version.

### 8.3 Audit trail

Every transition is logged: who, when, from-state, to-state, and comment. The audit log is append-only and exportable as CSV.

---

## 9. Prompt Testing

Every prompt has a test suite: defined inputs with expected output characteristics. This is exactly what software teams do, applied to prompts.

### 9.1 Test case structure

| Field | Type |
|-------|------|
| Test Case ID | Auto-generated |
| Test Name | String |
| Input | The content fed to the prompt |
| Expected Behavior | Assertion about the output |
| Result | Pass / Fail |
| Evidence | Output sample or reviewer note |
| Tested By / Date | User reference, timestamp |

### 9.2 Example test suite: Release Notes Generator

| # | Input | Expected | Result |
|---|-------|----------|--------|
| 1 | New Fraud Analytics dashboard | Feature summary included | Pass |
| 2 | Deprecated API | Deprecation warning present | Pass |
| 3 | Security enhancement | Security section generated | Pass |

### 9.3 Testing rules

- Minimum 3 test cases per prompt; High risk prompts require minimum 5, including at least one adversarial case (an input designed to provoke hallucination or policy violation).
- A version cannot advance from Testing with any failed case.
- Test suites are versioned alongside the prompt. Changing the test suite requires Reviewer role.
- Regression rule: when a new version is created, the previous version's test suite is copied forward as the starting suite.

---

## 10. System Architecture

### 10.1 Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React with Next.js | Component reuse, server-side rendering for the dashboard, fast iteration |
| Backend | Python FastAPI | Async, typed, automatic OpenAPI generation (which feeds the documentation set directly) |
| Database | PostgreSQL | Relational integrity for the version/evaluation/test graph; JSONB for flexible metadata |
| Auth | JWT with role claims | Sufficient for v1; SSO-ready interface boundary |

### 10.2 Component diagram (logical)

```
┌─────────────────────────────────────────────┐
│                 Next.js UI                  │
│  Library │ Prompt Detail │ Review │ Dashboard │
└──────────────────┬──────────────────────────┘
                   │ REST (OpenAPI)
┌──────────────────▼──────────────────────────┐
│               FastAPI Backend                │
│  Prompt Service │ Version Service            │
│  Evaluation Service │ Workflow Engine        │
│  Governance Checks │ Audit Logger            │
└──────────────────┬──────────────────────────┘
                   │ SQLAlchemy
┌──────────────────▼──────────────────────────┐
│               PostgreSQL                     │
└─────────────────────────────────────────────┘
```

### 10.3 Database schema

**prompts**

| Column | Type | Constraints |
|--------|------|-------------|
| prompt_id | UUID | PK |
| name | VARCHAR(120) | UNIQUE NOT NULL |
| description | TEXT | NOT NULL |
| category | VARCHAR(50) | NOT NULL |
| subcategory | VARCHAR(50) | NOT NULL |
| owner_id | UUID | FK → users |
| status | VARCHAR(20) | NOT NULL, default 'Draft' |
| current_version | VARCHAR(10) | NULL until first approval |
| target_model | VARCHAR(50) | NOT NULL |
| risk_level | VARCHAR(10) | NOT NULL, default 'Medium' |
| tags | JSONB | default '[]' |
| created_by | UUID | FK → users |
| created_at / updated_at | TIMESTAMP | auto |

**versions**

| Column | Type | Constraints |
|--------|------|-------------|
| version_id | UUID | PK |
| prompt_id | UUID | FK → prompts, NOT NULL |
| version_number | VARCHAR(10) | NOT NULL; UNIQUE per prompt |
| prompt_text | TEXT | NOT NULL, immutable after submission |
| change_summary | VARCHAR(255) | NOT NULL |
| status | VARCHAR(20) | NOT NULL |
| created_by | UUID | FK → users |
| created_at | TIMESTAMP | auto |

**evaluations**

| Column | Type | Constraints |
|--------|------|-------------|
| evaluation_id | UUID | PK |
| version_id | UUID | FK → versions |
| run_number | INT | NOT NULL |
| accuracy_score | INT | CHECK 1-10 |
| completeness_score | INT | CHECK 1-10 |
| tone_score | INT | CHECK 1-10 |
| hallucination_score | INT | CHECK 1-10 |
| formatting_score | INT | CHECK 1-10 |
| overall_score | NUMERIC(5,2) | computed |
| evaluated_by | UUID | FK → users |
| evaluated_at | TIMESTAMP | auto |

**test_cases / test_runs**

| Column | Type |
|--------|------|
| test_case_id | UUID PK |
| version_id | UUID FK |
| name, input, expected_behavior | TEXT |
| result | VARCHAR(10) (Pass/Fail/Not Run) |
| evidence | TEXT |
| tested_by, tested_at | UUID, TIMESTAMP |

**workflow_log** (append-only audit)

| Column | Type |
|--------|------|
| log_id | UUID PK |
| version_id | UUID FK |
| from_status, to_status | VARCHAR(20) |
| actor_id | UUID FK |
| comment | TEXT |
| logged_at | TIMESTAMP |

**governance_checks** (see Section 12)

| Column | Type |
|--------|------|
| check_id | UUID PK |
| version_id | UUID FK |
| check_type | VARCHAR(30) (PII / Compliance / Bias / Hallucination / Ownership) |
| result | VARCHAR(10) (Pass / Flag / Fail) |
| notes | TEXT |
| checked_by, checked_at | UUID, TIMESTAMP |

### 10.4 API surface (v1)

All endpoints under `/api/v1`. FastAPI auto-generates the OpenAPI spec, which feeds directly into the documentation portal.

| Method | Endpoint | Purpose | Min role |
|--------|----------|---------|----------|
| GET | /prompts | List/filter library (category, status, owner, tag, risk) | Consumer |
| POST | /prompts | Create prompt | Author |
| GET | /prompts/{id} | Prompt detail with current version | Consumer |
| PATCH | /prompts/{id} | Update metadata (Draft only) | Author (owner) |
| GET | /prompts/{id}/versions | Version history | Consumer |
| POST | /prompts/{id}/versions | Create new version | Author |
| GET | /versions/{id}/diff/{other_id} | Diff two versions | Consumer |
| POST | /versions/{id}/transition | Workflow transition (body: to_status, comment) | Per Section 8 |
| POST | /versions/{id}/evaluations | Record evaluation run | Reviewer |
| GET | /versions/{id}/evaluations | Evaluation history | Consumer |
| POST | /versions/{id}/tests | Add test case | Reviewer |
| PATCH | /tests/{id} | Record test result | Reviewer |
| POST | /versions/{id}/governance-checks | Record governance check | Reviewer |
| GET | /dashboard/metrics | Aggregated dashboard data | Consumer |
| GET | /audit/export | Audit log CSV export | Approver |

Separation of duties is enforced in the transition endpoint: the backend rejects a transition where actor_id equals the version's created_by for In Review → Testing and Approved → Production.

---

## 11. Dashboard

Executives need library health at a glance. The dashboard answers: how big is the library, how healthy is it, and where is the risk.

### 11.1 Metrics (v1)

| Metric | Definition |
|--------|-----------|
| Total Prompts | Count of all prompts (excluding Retired) |
| Approved Prompts | Count in Approved or Production status |
| Average Quality Score | Mean overall_score of current Production versions |
| Most Used Prompts | Top 10 by consumer view count |
| Failed Prompts | Versions rejected in the last 90 days |
| Retired Prompts | Count of Retired prompts |
| Prompts by Risk Level | Distribution: Low / Medium / High |
| Governance Flags Open | Count of governance checks in Flag status |

### 11.2 Visual layout

- Top row: four stat cards (Total, Approved, Avg Score, Open Flags).
- Middle: quality score trend over time (line chart), prompts by category (bar chart).
- Bottom: risk distribution (donut), table of most used and recently failed prompts.

---

## 12. AI Governance Layer

Very few prompt management efforts include this. With it, PromptHub stops being prompt engineering and becomes AI governance.

### 12.1 Mandatory checks per version

| Check | What it verifies | Failure consequence |
|-------|-----------------|---------------------|
| PII Leakage | Prompt does not instruct the model to retain, expose, or request personal data; test outputs contain no PII | Hard block: cannot advance past Testing |
| Compliance Risk | Prompt usage aligns with applicable policy (data residency, regulatory constraints for the category) | Hard block for High risk; Flag for others |
| Bias Detection | Test outputs reviewed for biased language or skewed treatment across protected attributes | Flag: requires Approver acknowledgment |
| Hallucination Tracking | Hallucination metric score and any observed fabrications logged per version | Score feeds evaluation; repeat offenders escalate risk level |
| Prompt Ownership | Owner is current, reachable, and re-confirmed at each major version | Soft block: ownership must be re-confirmed |

### 12.2 Risk level mechanics

- Risk Level drives review depth: High risk requires 5+ test cases, ≥90% score, and a named Approver from the compliance category.
- Any prompt in the Compliance category is automatically High risk.
- Two consecutive hallucination flags on a prompt escalate its risk level one step automatically.

### 12.3 Review cadence

Production prompts are re-evaluated every 6 months, or immediately when the target model changes. The system surfaces overdue re-evaluations on the dashboard.

---

## 13. Documentation Set

This is where technical writing expertise becomes a structural advantage. The documentation is a first-class deliverable, structured as a docs-as-code portal (MkDocs Material recommended, mirroring the FinX stack).

| Document | Audience | Contents |
|----------|----------|----------|
| **User Guide** | Consumers, Authors | Finding prompts, reading scorecards, creating and submitting prompts |
| **Admin Guide** | Reviewers, Approvers | Governance process, workflow operations, evaluation procedure, taxonomy management |
| **Architecture Guide** | Engineers | System design, schema, API integration patterns, deployment |
| **API Reference** | Engineers | Generated from FastAPI OpenAPI spec, published into the portal |
| **Release Notes** | All | Version history of PromptHub itself, eating its own governance model |
| **FAQ** | All | Common questions, troubleshooting |
| **Prompt Design Standards** | Authors | Best practices: audience framing, output structure, grounding instructions, anti-hallucination patterns, examples of poor vs. excellent prompts (the Section 6.3 progression is the canonical example) |

Documentation acceptance criterion: a new Author can register, create, and submit a prompt using only the User Guide, with no human assistance.

---

## 14. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Performance | Library list and prompt detail pages load in under 2 seconds with 1,000 prompts |
| Auditability | Workflow log is append-only; no destructive deletes anywhere except Draft versions by their author |
| Data integrity | All version/evaluation/test writes are transactional; orphan records impossible by FK constraints |
| Security | Role checks enforced server-side on every endpoint; JWT expiry 8 hours; passwords hashed (bcrypt) |
| Portability | Entire system runs locally via docker-compose (web, api, db) with one command |
| Accessibility | Dashboard and forms meet WCAG 2.1 AA basics: contrast, keyboard navigation, labels |

### v2 candidates (explicitly out of scope for v1)

- Automated prompt execution against model APIs with programmatic evaluation
- LLM-as-judge scoring to supplement human review
- Prompt usage telemetry from consuming applications
- SSO/SAML, prompt import from files, Slack approval notifications

---

## 15. Build Plan and Milestones

| Phase | Deliverable | Estimate |
|-------|------------|----------|
| 1 | Data model + FastAPI scaffolding: prompts, versions, users, auth | Week 1 |
| 2 | Workflow engine + audit log + separation of duties | Week 2 |
| 3 | Evaluation and test case modules | Week 3 |
| 4 | Next.js UI: library, prompt detail, version diff, review screens | Weeks 4 to 5 |
| 5 | Dashboard + governance checks | Week 6 |
| 6 | Prompt catalog seeding (20 to 30 enterprise prompts across all four categories, each with metadata, versions, evaluations, and test suites) | Week 7 |
| 7 | Documentation portal (all seven documents) | Week 8 |
| 8 | Demo video (5 to 10 minutes), architecture diagram, repository polish | Week 9 |

---

## 16. Portfolio Deliverables Checklist

- [ ] GitHub repository with source code, docker-compose, and CI lint
- [ ] Architecture diagram (system design, draw.io source committed)
- [ ] Demo video, 5 to 10 minutes: create → version → test → evaluate → approve → dashboard
- [ ] Documentation portal (mini DOCenter): all seven documents live
- [ ] Prompt catalog: 20 to 30 governed enterprise prompts
- [ ] Evaluation framework with worked scorecards
- [ ] Governance model: workflow, checks, audit export

---

## 17. Acceptance Criteria (Definition of Done)

The project is complete when all of the following are demonstrable end to end:

1. A prompt can be created with full metadata and cannot be submitted while any required field is missing.
2. Three versions of the Release Notes Generator exist, each with a change summary, and the diff view shows the differences between any two.
3. A version with a failed test case cannot advance out of Testing.
4. A version scoring below threshold is rejected and returned to Draft with a logged comment.
5. The Author of a version cannot approve their own version (separation of duties verified).
6. Promoting version 1.3 to Production automatically retires version 1.2.
7. The audit log shows every transition with actor and timestamp, and exports to CSV.
8. A PII governance check in Fail status blocks promotion regardless of evaluation score.
9. The dashboard renders all eight metrics against the seeded catalog.
10. A fresh user completes the create-and-submit flow using only the User Guide.

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| Prompt Asset | A prompt plus its full metadata, treated as a governed organizational asset |
| Version | An immutable snapshot of prompt text with its own lifecycle state |
| Evaluation | A weighted, multi-metric quality score for one version |
| Test Suite | The set of input/expected-behavior cases attached to a version |
| Governance Check | A recorded PII, compliance, bias, hallucination, or ownership verification |
| Separation of Duties | The rule that no version's author may be its sole approver |
