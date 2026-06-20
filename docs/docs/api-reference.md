# API Reference

The PromptHub API is a REST API generated from FastAPI. The live interactive documentation is available at:

- **Swagger UI:** `http://localhost:8000/api/docs`
- **ReDoc:** `http://localhost:8000/api/redoc`
- **OpenAPI JSON:** `http://localhost:8000/api/openapi.json`

All endpoints are under `/api/v1`. Authentication is required for all endpoints. Use a Bearer JWT obtained from `/api/v1/auth/login`.

---

## Authentication

### POST /api/v1/auth/register
Create a new user account.

**Body:**
```json
{
  "username": "string",
  "email": "user@example.com",
  "password": "string",
  "full_name": "string",
  "roles": "consumer"
}
```

### POST /api/v1/auth/login
Obtain a JWT token.

**Body:**
```json
{ "username": "string", "password": "string" }
```

**Response:**
```json
{ "access_token": "string", "token_type": "bearer" }
```

---

## Prompts

| Method | Path | Description | Min role |
|--------|------|-------------|----------|
| GET | /prompts | List/filter library | Consumer |
| POST | /prompts | Create prompt | Author |
| GET | /prompts/{id} | Prompt detail (increments view count) | Consumer |
| PATCH | /prompts/{id} | Update metadata (Draft only) | Author (owner) |
| GET | /prompts/{id}/versions | Version history | Consumer |
| POST | /prompts/{id}/versions | Create new version | Author |

**Query filters for GET /prompts:**
- `category` — exact match
- `status` — exact match
- `owner_id` — UUID
- `tag` — checks if tag is in the JSONB array
- `risk_level` — Low / Medium / High

---

## Versions

| Method | Path | Description | Min role |
|--------|------|-------------|----------|
| GET | /versions/{id}/diff/{other_id} | Side-by-side diff | Consumer |
| POST | /versions/{id}/transition | Workflow transition | Per state |

**Transition body:**
```json
{ "to_status": "In Review", "comment": "Optional reason" }
```

Valid transitions and role requirements:

| From | To | Roles |
|------|-----|-------|
| Draft | In Review | Author, Reviewer, Approver |
| In Review | Testing | Reviewer, Approver |
| In Review | Draft | Reviewer, Approver |
| Testing | Approved | Reviewer, Approver |
| Testing | In Review | Reviewer, Approver |
| Approved | Production | Approver only |
| Approved | Testing | Approver only |
| Production | Retired | Approver only |

---

## Evaluations

| Method | Path | Description | Min role |
|--------|------|-------------|----------|
| POST | /versions/{id}/evaluations | Record evaluation run | Reviewer |
| GET | /versions/{id}/evaluations | List evaluations | Consumer |

**Evaluation body:**
```json
{
  "accuracy_score": 9,
  "completeness_score": 8,
  "tone_score": 10,
  "hallucination_score": 8,
  "formatting_score": 9
}
```

All scores must be 1–10. The overall score is computed server-side using the weighted formula:
`(accuracy × 0.30 + completeness × 0.25 + tone × 0.15 + hallucination × 0.20 + formatting × 0.10) × 10`

---

## Test Cases

| Method | Path | Description | Min role |
|--------|------|-------------|----------|
| POST | /versions/{id}/tests | Add test case | Reviewer |
| GET | /versions/{id}/tests | List test cases | Consumer |
| PATCH | /tests/{id} | Record result (Pass/Fail) | Reviewer |

---

## Governance Checks

| Method | Path | Description | Min role |
|--------|------|-------------|----------|
| POST | /versions/{id}/governance-checks | Record check | Reviewer |
| GET | /versions/{id}/governance-checks | List checks | Consumer |

**Valid check_type values:** `PII`, `Compliance`, `Bias`, `Hallucination`, `Ownership`

**Valid result values:** `Pass`, `Flag`, `Fail`

---

## Dashboard

| Method | Path | Description | Min role |
|--------|------|-------------|----------|
| GET | /dashboard/metrics | All dashboard metrics | Consumer |

---

## Workflow Runner and v2 Workspace

| Method | Path | Description | Min role |
|--------|------|-------------|----------|
| GET/POST | /versions/{id}/variables | Read or define template variables | Author |
| GET/POST | /versions/{id}/examples | Read or create good input/output examples | Author |
| POST | /versions/{id}/run | Execute through the server-side model gateway and persist the run | Consumer for Approved/Production |
| GET | /runs | Run history; Consumers see own runs, Reviewers can see all | Consumer |
| POST | /runs/{id}/rating | Submit structured output feedback | Consumer |
| GET | /versions/{id}/field-quality | Aggregate real-usage quality signal | Consumer |
| POST | /runs/{id}/promote-example | Promote a run to an example | Author |
| POST | /runs/{id}/promote-test | Promote a run to a test case | Reviewer |
| POST | /integrations/{source}/fetch | Pull read-only source content into a run input | Consumer |
| GET/POST | /comments | Read or post workflow/version/run comments | Consumer |

The run endpoint enforces role/status access, required variables, governance checks, approved model routing, persistence, and blocked-attempt logging. The browser never receives model credentials.

---

## Style Profiles

| Method | Path | Description | Min role |
|--------|------|-------------|----------|
| GET | /style-profiles | List governed style profiles | Consumer |
| POST | /style-profiles | Create a style profile and rules | Author |
| POST | /prompts/{id}/style-profile/{profile_id} | Attach a profile to a workflow | Author |
| POST | /style-check | Flag banned phrases and terminology in output | Consumer |

---

## Audit

| Method | Path | Description | Min role |
|--------|------|-------------|----------|
| GET | /audit/export | Download audit log as CSV | Approver |

---

## Error responses

All errors follow FastAPI's default format:

```json
{ "detail": "string or object" }
```

Common status codes:

| Code | Meaning |
|------|---------|
| 400 | Bad request (validation, business rule violation) |
| 401 | Unauthenticated (missing or invalid token) |
| 403 | Forbidden (insufficient role, or separation-of-duties violation) |
| 404 | Resource not found |
| 422 | Unprocessable entity (Pydantic validation error) |
