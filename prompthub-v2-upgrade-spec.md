# PromptHub v2.0: From Governance Database to Governed Writing Workspace

**Upgrade Specification**
**Author:** Sulagna Sasmal
**Status:** Draft for build
**Supersedes:** PromptHub Specification v1.0
**Last updated:** June 2026

---

## 1. Why This Upgrade Exists

The reviewer's diagnosis is correct and worth stating plainly: v1.0 answers "how do we govern prompts?" but not "how do I write better documentation faster today?" The backend vision is stronger than the product experience. The current New Prompt screen captures metadata and nothing else. It is a record, not a workspace.

The winning version is not GitHub for prompts. It is a governed prompt workspace for documentation teams, where approved writing workflows can be run, tested, improved, and reused. Governance should wrap the work, not guard the door.

This upgrade keeps every governance capability v1.0 built (versioning, evaluation, approval workflow, audit, risk tiers). It changes what a writer sees first, what the core object is, and what they can do in the product. The governance backbone becomes load-bearing infrastructure underneath a writer-native surface, not the surface itself.

The principle holds: documentation is not an afterthought, it is infrastructure. The same is true of the governance here. It should be present and trustworthy without being the thing a writer has to think about to get work done.

---

## 2. The Core Reframe

### 2.1 The primary object changes

| | v1.0 | v2.0 |
|--|------|------|
| Core object | Prompt (a governed record) | Workflow (a runnable writing task) |
| First screen | Governance dashboard | Working library of runnable workflows |
| Primary verb | Register and govern | Find, run, adapt, improve |
| Governance | The front door | A wrapper around the work |

A **Workflow** is what a writer actually has in mind: "generate release notes," "summarize API changes," "turn a support case into a KB article." It contains the prompt, but it also contains the inputs the prompt needs, example inputs and outputs, the approved model, the owner, version history, test examples, usage notes, a quality score, and a Run button.

In data terms, a Workflow is a Prompt asset (the v1.0 model, unchanged) plus the new runnable layer defined in this spec. No v1.0 data is discarded. Every existing prompt becomes a Workflow with its runnable fields initially empty, to be filled in as part of migration (Section 9).

### 2.2 Governance after utility

Governance does not disappear. It changes position. A writer should be able to find, run, and adapt an approved workflow without ever opening a governance screen. The governance state is visible as a trust signal (an "Approved for production" badge, a quality score, an owner), and the full governance machinery is one click away for reviewers and approvers who need it. Utility is the front room. Governance is the structure behind the walls.

---

## 3. New Information Architecture

### 3.1 First screen: the Working Library

The landing screen after sign-in is the Working Library, not the dashboard. It shows runnable workflows as cards, each with:

- Workflow name and one-line purpose
- Trust badge: Approved for production / In review / Draft
- Quality score (from v1.0 evaluations)
- Owner and target model
- A primary **Run** button and a secondary **View** link

Filters carry over from v1.0 (category, status, risk) and gain a writer-facing filter: **Task type** (Release Notes, API Summary, Migration Guide, KB Article, Tone Rewrite, Style Check, and so on). The default sort is "most used by my team," not "most recently governed."

The Dashboard remains, but moves to a tab for reviewers, approvers, and leads. It is no longer the front door.

### 3.2 Navigation

```
Working Library  |  Run History  |  Dashboard  |  Admin
   (default)         (per user)      (reviewers)   (approvers)
```

---

## 4. Feature Specifications

Built in the priority order the reviewer recommended. Each closes a named gap.

### 4.1 Prompt Runner (highest priority)

This is the feature that makes the tool alive. Without it, PromptHub is a filing cabinet.

**Behavior.** From any approved workflow, a writer can:

1. Open the workflow.
2. Fill the input fields (driven by the template variables in 4.2) or paste source material.
3. Click Run.
4. See the generated output rendered in a result pane.
5. Rate the output (4.4).
6. Save the run as an example or a test case (4.3, 4.5).
7. Suggest a prompt improvement, which opens a new Draft version (v1.0 versioning).

**Model routing (non-negotiable for enterprise use).** The Runner does not call public model APIs directly from the browser. All runs route through a server-side **model gateway** that holds credentials, enforces the workflow's approved target model, logs the run, and applies the governance checks in 4.7 before returning output. For regulated content, the gateway must target a private deployment (AWS Bedrock or equivalent), never a public consumer endpoint. This mirrors the confidentiality constraint that applies to any AI feature handling proprietary or regulated material: source content never leaves the governed boundary.

**Run record.** Every run is persisted: workflow, version used, input (or a redacted reference for sensitive inputs), output, model, latency, rating, and the running user. This is what feeds real-usage quality signals (4.4) and Run History.

**Guardrails.**
- Only Approved or Production versions are runnable by Consumers. Authors and Reviewers can run Draft versions in a sandbox marked "not for production output."
- A run that trips a hard governance check (PII, compliance) returns a blocked result with the reason, and the attempt is logged.

### 4.2 Template Variables

Prompts become parameterized. A workflow prompt declares typed variables that render as input fields in the Runner.

**Syntax.** Variables in prompt text use double braces: `{{release_notes}}`, `{{jira_ticket}}`, `{{api_diff}}`, `{{audience}}`, `{{tone}}`.

**Variable definition.** Each variable carries:

| Field | Purpose |
|-------|---------|
| Name | Matches the token in the prompt text |
| Label | Human-readable field label in the Runner |
| Type | text / long-text / select / source-reference (4.6) |
| Required | Boolean |
| Default | Optional default value |
| Help text | One line guiding the writer |
| Example value | Pre-fills the sandbox and seeds the examples library |

**Validation.** The Runner blocks a run if a required variable is empty. The version cannot leave Draft if its prompt text references an undeclared variable, or declares a variable it never uses. This is a structural check, run the same way v1.0 validates metadata completeness.

### 4.3 Examples Library

Every workflow shows "good input, good output" examples so a writer knows what the prompt is for and what good looks like before they run it.

- Each example stores the input variable set, the produced output, the model, and a short note on why it is a good example.
- Examples are created two ways: authored deliberately, or promoted from a highly rated run (4.4).
- Examples are versioned with the workflow. When a major version changes intent, examples flagged as stale require re-confirmation.
- The first example is mandatory before a workflow can be Approved. A workflow with no example of good output is not ready for others to trust.

### 4.4 Output Evaluation From Real Usage

v1.0 scored prompts in formal review. v2.0 adds the missing feedback loop: writers rate outputs in the flow of real work.

**Lightweight rating.** After any run, the writer can rate the output with structured tags rather than a single star count:

- Useful
- Inaccurate
- Too verbose
- Wrong tone
- Missing details
- Hallucinated content

Plus an optional free-text comment.

**How ratings are used.**
- Ratings aggregate into a **real-usage quality signal** per version, shown alongside the formal evaluation score. The two are kept distinct: formal review score (controlled, from Reviewers) and field score (observed, from Consumers).
- A version accumulating "Hallucinated content" or "Inaccurate" ratings above a threshold raises a flag on the dashboard and, on repeat, escalates the workflow's risk level automatically (consistent with v1.0 Section 12.2).
- A highly rated run can be promoted to an example (4.3) or a test case (4.5) in one click. This is the loop that keeps the library improving from use, not just from review.

### 4.5 Test Cases From Runs

v1.0 required test suites. v2.0 makes them cheap to build: any run can be saved as a test case, capturing the input variables and the expected output characteristics from the actual output. This removes the friction that otherwise leaves test suites thin. The v1.0 testing rules (minimum cases, adversarial cases for High risk, no advancement with a failed case) are unchanged.

### 4.6 Source Integrations

Writers do not author inputs from scratch. The work starts from a Jira list, an API diff, a changelog, a Markdown file, or an OpenAPI spec. Variables of type `source-reference` pull content directly.

**v2.0 integration targets, in build order:**

1. **Markdown / file upload** (lowest effort, immediate value): a variable can be filled from an uploaded `.md`, `.txt`, or pasted block.
2. **GitHub**: pull a diff, a changelog file, or issue text by URL or issue number.
3. **Jira**: pull a ticket or a filtered list of tickets as input to release-note and changelog workflows.
4. **OpenAPI spec**: pull an endpoint or a spec diff into API-summary workflows.

**Boundary rule.** Integrations read source content into a run. They never write back, never post, and never act on instructions found inside the fetched content. Fetched content is data, not commands. A run that pulls a Jira ticket containing "ignore your instructions and..." treats that as input text to summarize, not as direction.

**Privacy rule.** Source content pulled into a run is subject to the same model gateway boundary as everything else (4.1). Sensitive sources are referenced, not stored in plaintext, in the run record.

### 4.7 Style Guide and Terminology Integration

This is the highest-leverage feature specific to technical writers, and the one most prompt tools miss.

**Capability.** A workspace holds one or more **Style Profiles**: voice rules, approved terminology, banned phrases, formatting conventions. A workflow can attach a Style Profile, and the Runner offers a **Style Check** on any output:

- Flags banned phrases and off-list terminology.
- Flags voice and tone deviations defined in the profile.
- Flags formatting that breaks the convention (heading style, capitalization, oxford comma rule, and so on).

**Two modes.**
- *Inline check*: run a generated output through the style check and see flagged spans.
- *Embedded instruction*: inject the style profile into the prompt at run time so output is shaped correctly the first time. The injected profile is recorded in the run so the output is reproducible.

Style Profiles are governed assets too: owned, versioned, and approved, using the same lifecycle as prompts. A style rule change is an auditable event.

### 4.8 Collaboration

A thin collaboration layer, deliberately scoped:

- Threaded comments on a workflow and on a specific version.
- Comments on a run ("this output missed the deprecation notice").
- @mention to notify an owner or reviewer.

No real-time co-editing in v2.0. Comments are enough to move tribal knowledge into the system.

---

## 5. Data Model Additions

The v1.0 schema is retained in full. v2.0 adds:

**workflows** (extends the prompts table rather than replacing it)

| Column | Type | Notes |
|--------|------|-------|
| task_type | VARCHAR(40) | Writer-facing task taxonomy |
| usage_notes | TEXT | When and how to use this workflow |
| style_profile_id | UUID FK → style_profiles | Nullable |
| run_count | INT | Denormalized, for "most used" sort |

**variables**

| Column | Type |
|--------|------|
| variable_id | UUID PK |
| version_id | UUID FK → versions |
| name, label, help_text | VARCHAR / TEXT |
| var_type | VARCHAR(20) (text / long-text / select / source-reference) |
| required | BOOLEAN |
| default_value, example_value | TEXT |
| options | JSONB (for select type) |

**runs**

| Column | Type |
|--------|------|
| run_id | UUID PK |
| version_id | UUID FK |
| run_by | UUID FK → users |
| input_payload | JSONB (redacted reference if sensitive) |
| output_text | TEXT |
| model | VARCHAR(50) |
| latency_ms | INT |
| style_profile_applied | UUID FK, nullable |
| governance_result | VARCHAR(10) (Pass / Blocked) |
| created_at | TIMESTAMP |

**run_ratings**

| Column | Type |
|--------|------|
| rating_id | UUID PK |
| run_id | UUID FK |
| rated_by | UUID FK |
| tags | JSONB (structured rating tags) |
| comment | TEXT |
| created_at | TIMESTAMP |

**examples**

| Column | Type |
|--------|------|
| example_id | UUID PK |
| version_id | UUID FK |
| input_payload | JSONB |
| output_text | TEXT |
| note | TEXT |
| source_run_id | UUID FK, nullable (if promoted from a run) |
| is_stale | BOOLEAN |

**style_profiles** and **style_rules**

| style_profiles | |
|--|--|
| style_profile_id | UUID PK |
| name, owner_id, status, version_number | per v1.0 governance pattern |

| style_rules | |
|--|--|
| rule_id | UUID PK |
| style_profile_id | UUID FK |
| rule_type | VARCHAR(20) (banned_phrase / terminology / voice / formatting) |
| pattern | TEXT |
| message | TEXT (what to show when flagged) |
| severity | VARCHAR(10) (error / warning) |

**comments**

| Column | Type |
|--------|------|
| comment_id | UUID PK |
| target_type | VARCHAR(20) (workflow / version / run) |
| target_id | UUID |
| author_id | UUID FK |
| body | TEXT |
| created_at | TIMESTAMP |

---

## 6. API Additions

All under `/api/v1`, additive to the v1.0 surface.

| Method | Endpoint | Purpose | Min role |
|--------|----------|---------|----------|
| POST | /versions/{id}/run | Execute via the model gateway, return output, persist run | Consumer (Approved versions only) |
| GET | /runs | Run history (filterable by user, workflow, date) | Consumer (own runs); Reviewer (all) |
| POST | /runs/{id}/rating | Submit a structured output rating | Consumer |
| POST | /runs/{id}/promote-example | Promote a run to an example | Author |
| POST | /runs/{id}/promote-test | Promote a run to a test case | Reviewer |
| GET/POST | /versions/{id}/variables | Read/define template variables | Author |
| GET/POST | /versions/{id}/examples | Read/create examples | Author |
| POST | /style-profiles | Create style profile | Author |
| POST | /style-check | Run output through a style profile, return flags | Consumer |
| POST | /integrations/{source}/fetch | Pull source content into a run input (read-only) | Consumer |
| GET/POST | /comments | Read/post comments | Consumer |

The run endpoint enforces, in order: role and status check, required-variable check, governance pre-checks (4.7), model gateway call, governance post-checks on output, persistence. A failure at any governance gate returns a blocked result with the reason and logs the attempt.

---

## 7. UX Principles

The reviewer's note that the UI is "functional but not yet delightful or writer-native" is the bar to clear. Principles:

1. **Run is the loudest action on every workflow.** Everything else is secondary.
2. **A writer reaches output in three clicks from sign-in:** open workflow, fill inputs, run.
3. **Trust signals over governance jargon.** Show "Approved, quality 88%, owned by Docs" rather than workflow-state machinery on the writer's surface.
4. **Examples are visible before the run,** so a writer knows what good looks like without experimenting.
5. **Governance is one click away, never in the way.** Reviewers get the full machinery on a dedicated surface.
6. **The result pane is a working surface:** copy, rate, save as example, suggest improvement, all without leaving it.

---

## 8. What Stays From v1.0 (Unchanged)

To be explicit, the upgrade does not weaken governance. These v1.0 capabilities remain exactly as specified:

- Prompt asset model and required metadata (v1.0 Section 5)
- Semantic versioning, immutable versions, version diff (v1.0 Section 6)
- Five-metric weighted evaluation framework and score thresholds (v1.0 Section 7)
- Six-state lifecycle and approval workflow with separation of duties (v1.0 Section 8)
- Test suites with adversarial cases for High risk (v1.0 Section 9)
- Governance checks: PII, compliance, bias, hallucination, ownership (v1.0 Section 12)
- Append-only audit log and CSV export (v1.0 Section 8.3)
- Documentation set (v1.0 Section 13), now extended with a Runner user guide and Style Profile authoring guide

---

## 9. Migration From v1.0

No destructive migration. The path:

1. **Schema:** add the new tables and columns (Section 5). Existing prompts gain empty runnable fields.
2. **Backfill:** every existing prompt becomes a Workflow. For each, an owner adds at minimum one set of template variables and one example before it can carry the "runnable" badge. Un-backfilled prompts remain visible and governed, marked "metadata only, not yet runnable."
3. **Model gateway:** stand up the server-side gateway and point it at the approved private model deployment before the Runner ships. The Runner does not go live without it.
4. **IA switch:** flip the default landing screen from Dashboard to Working Library once at least the seeded catalog is runnable.

---

## 10. Build Plan

| Phase | Deliverable | Estimate |
|-------|------------|----------|
| 1 | Schema additions, model gateway service, run persistence | Week 1 to 2 |
| 2 | Template variables (declaration, validation, Runner input rendering) | Week 2 to 3 |
| 3 | Prompt Runner end to end (run, output pane, run record) | Week 3 to 4 |
| 4 | Output rating loop + promote-to-example / promote-to-test | Week 4 to 5 |
| 5 | Examples library surface | Week 5 |
| 6 | Working Library IA + writer-native UX pass | Weeks 5 to 6 |
| 7 | Style Profiles + Style Check | Weeks 6 to 7 |
| 8 | Source integrations (Markdown, GitHub, Jira, OpenAPI in that order) | Weeks 7 to 9 |
| 9 | Comments | Week 9 |
| 10 | Documentation update + demo video re-shoot showing the run loop | Week 10 |

Phases 1 to 6 deliver the product the reviewer is asking for. Phases 7 to 9 are the differentiators that make it writer-native rather than generic.

---

## 11. Acceptance Criteria (Definition of Done)

The upgrade is complete when all of the following are demonstrable:

1. A writer signs in and lands on the Working Library, not the Dashboard.
2. A writer opens an approved workflow, fills its variables, runs it, and sees output in three clicks from sign-in.
3. A required variable left empty blocks the run with a clear message.
4. Output is generated through the server-side model gateway against the workflow's approved model, and the public-API path is provably unavailable from the browser.
5. A run that trips a PII or compliance check returns a blocked result with the reason, and the attempt is logged.
6. A writer rates an output with structured tags, and the rating appears in the version's field-quality signal distinct from its formal review score.
7. A highly rated run is promoted to an example and to a test case in one click each.
8. A workflow cannot be Approved without at least one example of good output.
9. A Style Profile flags a banned phrase in generated output, and the same profile can be injected at run time to prevent it.
10. A release-notes workflow pulls a Jira ticket as input via the integration, and the fetched content is treated as data, with any embedded instructions ignored.
11. Every v1.0 governance capability (versioning, evaluation, approval with separation of duties, audit export) still passes its original acceptance criteria.
12. A fresh writer completes find-run-adapt-improve using only the User Guide.

---

## 12. Implementation Status Audit

**Audit date:** June 20, 2026
**Status key:** Done = implemented and testable in the current app. Partial = a usable slice exists, but the full spec is not complete. Pending = not implemented yet.

### 12.1 Information Architecture

| Item | Status |
|------|--------|
| Working Library as default signed-in surface | Done |
| Run History | Done |
| Dashboard retained for governance visibility | Done |
| Admin area | Done |
| Review Queue | Done |
| Style Profiles | Done |
| Integrations | Done |
| Deployments | Done |
| In-app manual/help | Done |

### 12.2 Feature Specifications

| Feature | Status | Notes |
|---------|--------|-------|
| Prompt Runner | Done | Workflows can be run from the detail page through the backend gateway. |
| Server-side model gateway boundary | Done | Gateway exists, blocks direct browser provider calls, and can route to configured server-side providers. |
| Run persistence | Done | Runs store input payload, output, model, latency, governance result, user, and timestamp. |
| Runner guardrails | Done | Consumers can only run Approved or Production versions; PII/compliance blocks are logged. |
| Template variables | Done | Variables are declared, validated against prompt text, rendered as inputs, and required fields block runs. |
| Examples library | Done | Examples exist and runs can be promoted to examples. |
| Mandatory example before approval | Done | Transition to Approved checks for at least one example. |
| Output evaluation from real usage | Done | Structured ratings and field-quality signal exist. |
| Test cases from runs | Done | Reviewer/approver can promote a run into a test case. |
| Markdown/file source input | Done | Markdown and pasted source are accepted in source fetch and runner input. |
| GitHub source input | Done | Public GitHub URLs can be fetched read-only for issues, PRs, commits, blobs, and repository summaries. |
| Jira source input | Partial | UI/API accept Jira locators and pasted content; live Jira authentication/fetch is pending. |
| OpenAPI source input | Partial | Pasted spec content is accepted; URL fetch and diff parser are pending. |
| Style Guide and Terminology Integration | Done | Style profiles, rules, attachment, runtime injection, and style checks exist. |
| Collaboration comments | Done | Comments can be added to workflow versions. |

### 12.3 Data Model Additions

| Table/Field | Status |
|-------------|--------|
| workflows extension fields on prompts | Done |
| variables | Done |
| runs | Done |
| run_ratings | Done |
| examples | Done |
| style_profiles | Done |
| style_rules | Done |
| comments | Done |

### 12.4 API Additions

| Endpoint | Status |
|----------|--------|
| `POST /versions/{id}/run` | Done |
| `GET /runs` | Done |
| `POST /runs/{id}/rating` | Done |
| `POST /runs/{id}/promote-example` | Done |
| `POST /runs/{id}/promote-test` | Done |
| `GET/POST /versions/{id}/variables` | Done |
| `GET/POST /versions/{id}/examples` | Done |
| `GET/POST /style-profiles` | Done |
| `POST /style-check` | Done |
| `POST /integrations/{source}/fetch` | Done |
| `GET/POST /comments` | Done |

### 12.5 Build Plan

| Phase | Status |
|-------|--------|
| 1. Schema additions, model gateway service, run persistence | Done |
| 2. Template variables | Done |
| 3. Prompt Runner end to end | Done |
| 4. Output rating loop and promote-to-example/test | Done |
| 5. Examples library surface | Done |
| 6. Working Library IA and writer-native UX pass | Done |
| 7. Style Profiles and Style Check | Done |
| 8. Source integrations | Partial |
| 9. Comments | Done |
| 10. Documentation update and demo video | Partial |

### 12.6 Acceptance Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Writer signs in and lands on Working Library | Done |
| 2 | Writer opens approved workflow, fills variables, runs it, sees output | Done |
| 3 | Required variable left empty blocks run | Done |
| 4 | Output generated through server-side gateway | Done |
| 5 | PII/compliance run block returns reason and logs attempt | Done |
| 6 | Writer rates output and field-quality signal updates | Done |
| 7 | Highly rated run can be promoted to example and test | Done |
| 8 | Workflow cannot be Approved without example | Done |
| 9 | Style Profile flags banned phrase and can be injected at runtime | Done |
| 10 | Release-notes workflow pulls Jira ticket as input | Partial |
| 11 | v1 governance capabilities still pass | Done |
| 12 | Fresh writer completes find-run-adapt-improve using only User Guide | Done |

---

## 13. The One-Sentence Statement of the Upgrade

PromptHub stops being GitHub for prompts and becomes a governed prompt workspace for documentation teams, where approved writing workflows can be run, tested, improved, and reused, with governance wrapping the work instead of guarding the door.
