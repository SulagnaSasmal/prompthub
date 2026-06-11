# FAQ

## General

**What is PromptHub?**
PromptHub is a centralized prompt management system that brings version control, ownership, testing, approval workflows, and quality measurement to enterprise AI prompts.

**Who should use PromptHub?**
Any team using LLMs in their workflows: documentation teams, support operations, product management, compliance, and engineering.

**Does PromptHub execute prompts against live APIs?**
Not in v1. Evaluation scores are entered by Reviewers based on their own test runs. Automated execution is planned for v2.

---

## Roles

**How do I get a Reviewer or Approver role?**
Contact your PromptHub administrator. Roles are set at registration or updated via the API by an administrator.

**Can I hold multiple roles?**
Yes. The `roles` field is a comma-separated list (e.g., `author,reviewer`).

**Why can't I approve my own version?**
Separation of duties: the author of a version cannot be its sole Reviewer or Approver. This is enforced at the API level and cannot be bypassed.

---

## Versioning

**When should I create a new major version vs. a minor version?**
- **Major (X.0):** The intent changes, the output structure changes, or you switch to a different target model.
- **Minor (X.Y):** You refine the prompt while preserving its intent.

**Can I edit a version I already submitted for review?**
No. Once submitted, the prompt text is locked. Create a new version with your corrections.

**What happens when I promote a new version to Production?**
The previous Production version is automatically moved to Retired. Only one version can hold Production status at a time.

**Are Retired versions deleted?**
Never. Retired versions remain readable forever for audit purposes. Only the text and metadata access is read-only.

---

## Evaluation

**What is the minimum evaluation score to get approved?**
- Low and Medium risk: 85%
- High risk: 90%
- Below 70%: automatic rejection to Draft

**What happens if my score is between 70% and 84%?**
An Approver may approve Low risk prompts in this range with documented rationale in the comment field. High risk prompts cannot be approved below 90%.

**Why does the hallucination metric use a higher score to indicate lower risk?**
A score of 10 means zero fabrications observed in testing. A score of 1 means the output was full of fabricated content. Higher score = lower hallucination risk.

---

## Governance

**What is a "Flag" governance result?**
Flag means a risk was identified but acknowledged by the Reviewer. It does not block promotion but requires the Approver to be aware of it when making their decision.

**Can a PII check failure ever be overridden?**
No. A PII governance check in Fail status is an absolute block on promotion to Production. The prompt must be revised (new version) to remove the PII issue.

**What triggers an automatic risk level escalation?**
Two consecutive Hallucination governance check flags (Flag or Fail results) on the same prompt automatically escalate the risk level by one step (Low → Medium → High).

---

## Operations

**How do I run the full stack locally?**
```bash
docker-compose up --build
```
Then seed the catalog:
```bash
docker-compose exec api python -m seed.catalog
```

**Where is the API documentation?**
`http://localhost:8000/api/docs` (Swagger) or `http://localhost:8000/api/redoc` (ReDoc).

**How do I export the audit log?**
As an Approver: `GET /api/v1/audit/export`. The response is a CSV file.

**What are the default credentials after seeding?**
Password for all seeded users: `Prompthub2026!`
Usernames: `admin`, `author1`, `reviewer1`, `approver1`, `consumer1`
