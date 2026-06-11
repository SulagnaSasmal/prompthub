# PromptHub

**Enterprise Prompt Management System** — version control, ownership, testing, approval workflows, and quality measurement for AI prompts.

> Think GitHub + DOCenter for prompts.

---

## What it is

Organizations running LLMs accumulate prompts with no version control, no ownership, no testing, and no quality measurement. PromptHub treats every prompt as a governed asset:

| Without PromptHub | With PromptHub |
|------------------|----------------|
| Prompts in chat histories and wikis | Central library with search and filters |
| No version history | Immutable versions with diff view |
| Nobody owns failures | Every prompt has a named owner |
| Prompts ship untested | Structured test suites with Pass/Fail |
| No quality data | Weighted 5-metric evaluation scores |
| No approval chain | 4-role workflow with separation of duties |
| No audit trail | Append-only log, exportable as CSV |

---

## Quick start (Docker)

```bash
git clone https://github.com/SulagnaSasmal/prompthub.git
cd prompthub
docker-compose up --build
```

Then seed the catalog with 25 enterprise prompts:

```bash
docker-compose exec api python -m seed.catalog
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API (Swagger) | http://localhost:8000/api/docs |
| Docs portal | http://localhost:8080 |

**Default credentials** (seeded users, password: `Prompthub2026!`):

| Username | Role |
|----------|------|
| admin | all roles |
| author1 | author |
| reviewer1 | reviewer |
| approver1 | approver |
| consumer1 | consumer |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                Next.js 15 UI                     │
│  Library · Prompt Detail · Review · Dashboard    │
└──────────────────────┬──────────────────────────┘
                       │ REST (OpenAPI)
┌──────────────────────▼──────────────────────────┐
│             Python FastAPI Backend               │
│  Workflow Engine · Governance Checks            │
│  Evaluation Service · Audit Logger              │
└──────────────────────┬──────────────────────────┘
                       │ SQLAlchemy 2.0
┌──────────────────────▼──────────────────────────┐
│               PostgreSQL 16                      │
└─────────────────────────────────────────────────┘
```

**Stack:** Next.js 15 · FastAPI · PostgreSQL · SQLAlchemy + Alembic · JWT auth · Docker

---

## Repository structure

```
prompthub/
├── backend/
│   ├── app/
│   │   ├── core/          # Config, database, security
│   │   ├── models/        # SQLAlchemy models (7 tables)
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── routers/       # API endpoints (8 routers)
│   │   ├── services/      # Workflow engine, audit service
│   │   └── main.py
│   ├── alembic/           # Database migrations
│   ├── seed/              # 25-prompt enterprise catalog
│   └── tests/
├── frontend/
│   └── src/
│       ├── app/           # Next.js App Router pages
│       ├── components/    # React components
│       └── lib/           # API client, types
├── docs/                  # MkDocs documentation portal
├── .github/workflows/     # CI: lint + test + build
└── docker-compose.yml
```

---

## Governance model

### Roles

| Role | Can do |
|------|--------|
| Author | Create prompts and versions, submit for review |
| Reviewer | Test prompts, score evaluations, record governance checks |
| Approver | Promote to Production, retire, export audit log |
| Consumer | Read-only access to Production prompts |

**Separation of duties:** The author of a version cannot approve their own version. Enforced at the API level.

### Lifecycle

```
Draft → In Review → Testing → Approved → Production → Retired
```

### Evaluation scoring

| Metric | Weight |
|--------|--------|
| Accuracy | 30% |
| Completeness | 25% |
| Hallucination Risk | 20% |
| Tone Consistency | 15% |
| Formatting | 10% |

Threshold: ≥85% for approval (≥90% for High risk). Below 70% auto-rejects to Draft.

### Governance checks (5 mandatory per version)

PII · Compliance · Bias · Hallucination · Ownership

PII Fail = absolute production block. Two hallucination flags auto-escalate risk level.

---

## Documentation

Full documentation at `http://localhost:8080` after `docker-compose up`.

| Document | Audience |
|----------|----------|
| User Guide | Consumers, Authors |
| Admin Guide | Reviewers, Approvers |
| Prompt Design Standards | Authors |
| Architecture Guide | Engineers |
| API Reference | Engineers |
| FAQ | All |
| Release Notes | All |

---

## Prompt catalog

25 enterprise prompts across four categories, each with full metadata, version history, evaluations, test suites, and governance checks:

- **Documentation** (8): Release Note Generator, API Reference Summarizer, Installation Guide Drafter, What's New Announcer, Changelog Entry Writer, Executive Briefing Summarizer, Meeting Notes Formatter, Data Dictionary Entry Generator
- **Support** (7): Support Case Summarizer, Escalation Analyzer, RCA Generator, Customer Sentiment Classifier, KB Article Generator, Email Response Drafter
- **Product Management** (5): Feature Description Writer, User Story Generator, Acceptance Criteria Refiner, Competitive Analysis Summarizer, Sprint Retrospective Facilitator
- **Compliance** (5): Policy Summary Generator, DPA Checker, Risk Assessment Narratives, Audit Finding Formatter, Vendor Risk Questionnaire Analyzer, Job Description Bias Reviewer

---

## Running tests

```bash
docker-compose exec api pytest tests/ -v
```

---

## CI

GitHub Actions runs on every push:
- Backend: ruff lint + pytest
- Frontend: ESLint + Next.js build

---

## Specification

The full system specification is in [prompthub-spec.md](prompthub-spec.md).

---

*Built by Sulagna Sasmal — June 2026*
