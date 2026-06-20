# Admin Guide

This guide covers the responsibilities and workflows for **Reviewers** and **Approvers**.

---

## Roles and separation of duties

| Action | Reviewer | Approver |
|--------|----------|----------|
| Submit for review | Yes (own prompts) | Yes |
| Advance to Testing | Yes | Yes |
| Return to Draft | Yes | Yes |
| Record evaluations | Yes | Yes |
| Record test results | Yes | Yes |
| Record governance checks | Yes | Yes |
| Promote to Production | No | Yes |
| Archive / Retire | No | Yes |
| Export audit log | No | Yes |
| Modify category taxonomy | No | Yes |
| Lower a prompt's risk level | No | Yes |

**Separation of duties rule:** The author of a version cannot be its sole Reviewer or Approver. The API enforces this — any attempt to advance a version you authored will be rejected with a 403 error.

---

## Review workflow

### Step 1 — Prompt design review (In Review)

When a prompt enters **In Review**, check:

- Does the prompt text have a clear audience and output structure?
- Are anti-hallucination instructions present (especially for Medium/High risk)?
- Is the change summary accurate?
- Does the metadata match the actual prompt behavior?

If satisfied, advance to **Testing**. If not, return to Draft with mandatory comments explaining what needs fixing.

### Step 2 — Test suite (Testing)

Minimum requirements:

| Risk Level | Min test cases | Adversarial case required |
|-----------|---------------|--------------------------|
| Low | 3 | No |
| Medium | 3 | No |
| High | 5 | Yes (name must contain "adversarial") |

For each test case:
1. Feed the input to the prompt and the target model.
2. Evaluate the output against the expected behavior.
3. Record **Pass** or **Fail** with evidence (output sample or note).

!!! danger "Blocking rule"
    A version with any **Fail** test case cannot advance to Approved. Fix the prompt (create a new version) or update the expected behavior if the expectation was wrong.

### Step 3 — Evaluation scoring (Testing)

Run at least 3 evaluation sessions. For each session, score all five metrics 1–10:

| Metric | Weight | What to measure |
|--------|--------|----------------|
| Accuracy | 30% | Factual correctness against the source input |
| Completeness | 25% | Coverage of all required output elements |
| Tone Consistency | 15% | Adherence to the defined voice and audience |
| Hallucination Risk | 20% | Absence of fabricated facts or claims |
| Formatting | 10% | Structural compliance with expected output format |

The system computes the weighted overall score automatically.

**Score thresholds:**

| Score | Outcome |
|-------|---------|
| >= 85% (>= 90% for High risk) | Eligible for Approval |
| 70–84% | Conditional — Approver may approve Low risk with documented rationale |
| < 70% | Hard reject — returns to Draft automatically |

### Step 4 — Governance checks (Testing)

All five checks must be recorded before a version can advance to Approved:

| Check | What to verify | Failure consequence |
|-------|---------------|---------------------|
| PII | Prompt does not instruct model to retain, expose, or solicit personal data; test outputs are PII-free | Hard block |
| Compliance | Usage aligns with data residency and regulatory constraints for this category | Hard block for High risk |
| Bias | Test outputs reviewed for biased or skewed language across protected attributes | Flag — requires Approver acknowledgment |
| Hallucination | Hallucination metric score and any fabrications logged | Score feeds evaluation; two consecutive flags escalate risk level |
| Ownership | Owner is current, reachable, and confirmed | Soft block — re-confirm before advancing |

Results: **Pass**, **Flag** (acknowledged issue), **Fail** (hard block).

!!! danger "PII Fail is an absolute block"
    A PII governance check with Fail status blocks promotion to Production regardless of evaluation score or Approver override.

---

## Promoting to Production (Approvers only)

1. Verify the version is in **Approved** status.
2. Verify evaluation score meets the threshold for this risk level.
3. Verify no governance checks are in **Fail** status.
4. Click **Promote to Production**.
5. The system automatically retires the previous Production version and records the transition in the audit log.

---

## Deployment Webhooks

Approvers can configure deployment webhooks from **Admin**. Active endpoints receive a signed `prompt.production_deployed` POST whenever a version moves from Approved to Production.

Each payload includes prompt metadata, the production version, rendered template text, previous production version metadata, and a unified diff from the previous active version. Downstream systems should verify `X-PromptHub-Signature-256` with the endpoint secret before applying changes.

Failed deliveries are stored with retry metadata. Use **Retry** for one delivery or **Retry due** to retry pending deliveries whose backoff window has elapsed.

---

## Risk level management

- All Compliance category prompts are automatically **High** risk.
- Two consecutive Hallucination flags on the same prompt auto-escalate risk by one level.
- Only Approvers can lower a prompt's risk level.
- Increasing risk level does not require Approver action (the system does it automatically).

---

## Re-evaluation cadence

Production prompts are due for re-evaluation:
- Every **6 months**, or
- Immediately when the **target model changes**.

Overdue prompts are surfaced on the Dashboard. Reviewers should create a new version and run the full evaluation cycle.

---

## Exporting the audit log

1. Sign in as an Approver.
2. Call `GET /api/v1/audit/export` or use the Export button in the dashboard.
3. The response is a CSV with columns: log_id, prompt_name, version_number, from_status, to_status, actor, comment, logged_at.

The audit log is append-only. No record can be deleted.

---

## Taxonomy management

Approvers can add new categories and subcategories. New categories apply immediately to all future prompts. Existing prompts retain their original category.

To add a category, contact your PromptHub administrator (API key required for v1; self-service UI is a v2 feature).
