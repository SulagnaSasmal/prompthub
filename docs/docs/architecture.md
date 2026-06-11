# Architecture Guide

This document describes the PromptHub system architecture for engineers integrating with or deploying the system.

---

## Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS | SSR dashboard, component reuse, fast iteration |
| Backend | Python FastAPI | Async, typed, automatic OpenAPI generation |
| Database | PostgreSQL | Relational integrity for version/evaluation/test graph; JSONB for flexible metadata |
| Auth | JWT with role claims (python-jose, bcrypt) | Sufficient for v1; SSO-ready interface boundary |
| ORM | SQLAlchemy 2.0 + Alembic migrations | Type-safe models, declarative schema, zero-downtime migrations |
| Container | Docker + docker-compose | One-command local stack |

---

## Component diagram

```
┌─────────────────────────────────────────────────┐
│                  Next.js UI                      │
│  Library · Prompt Detail · Review · Dashboard    │
└──────────────────────┬──────────────────────────┘
                       │ REST (OpenAPI)
┌──────────────────────▼──────────────────────────┐
│               FastAPI Backend                    │
│  Prompt Service · Version Service               │
│  Evaluation Service · Workflow Engine           │
│  Governance Checks · Audit Logger               │
└──────────────────────┬──────────────────────────┘
                       │ SQLAlchemy
┌──────────────────────▼──────────────────────────┐
│               PostgreSQL                         │
└─────────────────────────────────────────────────┘
```

---

## Data model

### Entity relationships

```
users
  └─ owns many → prompts (owner_id)
  └─ creates many → prompts (created_by)

prompts
  └─ has many → versions

versions
  └─ has many → evaluations
  └─ has many → test_cases
  └─ has many → governance_checks
  └─ has many → workflow_log (append-only)
```

### Key constraints

- `prompts.name` is UNIQUE (case-insensitive check at API layer)
- `versions.version_number` is UNIQUE per prompt (enforced by API)
- `versions.prompt_text` is immutable once submitted (status != Draft)
- `workflow_log` is append-only — no updates or deletes
- All score columns have CHECK constraints (1–10)
- FK constraints prevent orphan records at the database level

---

## Workflow engine

The workflow engine (`backend/app/services/workflow.py`) enforces:

1. **Valid transitions** — only allowed state changes proceed; all others return 400
2. **Role requirements** — each transition is restricted to specific roles
3. **Separation of duties** — the version creator cannot approve their own version (checked for Testing and Production transitions)
4. **Pre-transition checks** — metadata completeness, test pass/fail, evaluation score threshold, governance block
5. **Auto-retirement** — promoting a version to Production automatically retires the current Production version
6. **Audit logging** — every transition appends an immutable record to `workflow_log`

---

## API design

All endpoints are under `/api/v1`. The FastAPI backend auto-generates an OpenAPI spec at `/api/openapi.json`, rendered at `/api/docs` (Swagger) and `/api/redoc` (ReDoc).

Authentication uses Bearer JWT. Roles are encoded in the token payload as a comma-separated string.

### Role enforcement

- `require_role("author", "reviewer", "approver")` — any of these roles
- `require_role("approver")` — Approver only
- `get_current_user` (no role restriction) — authenticated Consumer access

### Separation of duties (API-level)

The `/versions/{id}/transition` endpoint rejects transitions to `Testing` or `Production` when `actor_id == version.created_by`.

---

## Running locally

### Prerequisites

- Docker and Docker Compose
- (Optional) Python 3.12+ and Node.js 22+ for local development without Docker

### One-command start

```bash
docker-compose up --build
```

This starts:
- `db` — PostgreSQL on port 5432
- `api` — FastAPI on port 8000 (http://localhost:8000/api/docs)
- `web` — Next.js on port 3000 (http://localhost:3000)

### Seed the catalog

After the stack is running:

```bash
docker-compose exec api python -m seed.catalog
```

This loads 25 enterprise prompts with full metadata, versions, evaluations, test suites, and governance checks.

### Running tests

```bash
docker-compose exec api pytest tests/ -v
```

---

## Security

- Passwords hashed with bcrypt (passlib)
- JWT expiry: 8 hours
- Role checks enforced server-side on every endpoint (no client-side role gating)
- No destructive deletes: Draft versions by their author are the only deletable records (v1 omits this endpoint pending UX review)
- All writes to workflow_log are INSERT-only; no UPDATE or DELETE is permitted

---

## v2 roadmap (explicitly out of scope for v1)

- Automated prompt execution against model APIs
- LLM-as-judge scoring
- Usage telemetry from consuming applications
- SSO/SAML
- Slack approval notifications
- Prompt import from files
