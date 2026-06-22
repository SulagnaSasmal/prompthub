# Security and Privacy

PromptHub stores governed writing workflow data, run history, source references, credentials, and audit events. This page explains what is stored, how sensitive it is, and the controls expected before publishing beyond a controlled beta.

## Data Inventory

| Data type | Examples | Sensitivity | Controls |
| --- | --- | --- | --- |
| Workflow metadata | names, descriptions, tags, owner, risk level | Internal | Role-based edits and audit events. |
| Prompt versions | templates, variables, change summaries | Internal or confidential | Immutable version history and restricted editing. |
| Run inputs | pasted source material, Jira text, Markdown, OpenAPI snippets | Potentially confidential | Retention policy, redaction option, controlled export access. |
| Run outputs | generated drafts, summaries, release notes, KB articles | Potentially confidential | Retention policy, run ownership checks, export auditing. |
| Source references | GitHub URLs, Jira keys, OpenAPI URLs, content hashes | Internal or confidential | Reference-only storage by default. |
| Webhook secrets | HMAC secrets | Secret | Never returned by API responses; excluded from audit payloads. |
| Model provider credentials | API keys and gateway tokens | Secret | Encrypted at rest; only masked status is returned. |
| Enterprise auth credentials | OIDC/SAML client secrets | Secret | Encrypted at rest; only masked status is returned. |
| Audit events | actor, action, target, timestamp, minimized payload | Internal | Sensitive payload keys are redacted before storage. |

## Role-Based Access

PromptHub uses five roles:

- **Consumer**: browse and run approved or production workflows.
- **Author**: create and edit workflows, versions, variables, and examples.
- **Reviewer**: manage tests, evaluations, governance checks, and review queue actions.
- **Approver**: approve or promote versions and monitor deployments.
- **Admin**: manage credentials, integrations, model providers, retention, enterprise auth, and security settings.

The UI shows access notices on restricted pages, but the backend remains the source of truth. Denied sensitive actions return `403` and create a `permission.denied` audit event.

## Secret Handling

Secrets and credentials must never be displayed after save.

PromptHub returns status fields such as:

- `secret_status: configured`
- `credential_status: configured`

The raw values are not returned from list or create responses. Audit events also redact sensitive keys such as `secret`, `credentials`, `client_secret`, `token`, `password`, `input_payload`, `output_text`, and `content`.

## Source Storage Modes

PromptHub supports three source storage modes:

| Mode | Meaning | Recommended use |
| --- | --- | --- |
| `reference_only` | Store locator, hash, and metadata without retaining full private source content. | Default for production. |
| `redacted_content` | Store sanitized source content for troubleshooting or review. | Use only with a retention policy. |
| `full_content` | Store full source content. | Use only when approved by security and legal owners. |

## Retention Expectations

Retention policies should cover:

- run inputs,
- generated outputs,
- source references,
- export events,
- and audit history.

Until scheduled deletion jobs are enabled, teams should document the retention policy and verify storage behavior during production readiness reviews.

## Release Checklist

- [ ] Credential APIs return only masked status.
- [ ] Audit payloads do not contain raw secrets or private source content.
- [ ] Admin-only pages are protected by backend permission checks.
- [ ] Restricted pages show visible access notices.
- [ ] Retention policy is documented for the deployment.
- [ ] Source storage mode is documented for the deployment.
- [ ] Backup and restore procedures are documented separately before broad launch.
