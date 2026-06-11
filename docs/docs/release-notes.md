# PromptHub Release Notes

*PromptHub eats its own governance model: these release notes are maintained as a governed asset in the PromptHub catalog under the Documentation > Release Notes category.*

---

## v1.0.0 — June 2026

**Initial release.**

### Added
- Prompt Library with full metadata model: name, description, category/subcategory, owner, target model, risk level, tags
- Immutable version history: version number, prompt text, change summary, per-version lifecycle state
- Five-state approval workflow: Draft → In Review → Testing → Approved → Production → Retired
- Separation-of-duties enforcement: version author cannot approve their own version
- Weighted evaluation framework: Accuracy (30%), Completeness (25%), Tone (15%), Hallucination Risk (20%), Formatting (10%)
- Test suite: per-version test cases with Pass/Fail/Not Run results and evidence
- Governance layer: PII, Compliance, Bias, Hallucination, and Ownership checks with Pass/Flag/Fail results
- Auto-retirement: promoting a version to Production automatically retires the predecessor
- Auto-escalation: two consecutive Hallucination flags escalate the prompt's risk level
- Append-only audit log with CSV export
- Executive dashboard: total prompts, approved count, average quality score, open governance flags, risk distribution, category breakdown, most-viewed prompts
- Side-by-side and unified diff view between any two versions
- Prompt catalog: 25 enterprise prompts across Documentation, Support, Product Management, and Compliance categories, each with metadata, versions, evaluations, test suites, and governance checks
- One-command local stack: `docker-compose up --build`
- Documentation portal: User Guide, Admin Guide, Prompt Design Standards, Architecture, API Reference, FAQ, Release Notes

### Known limitations (v2 candidates)
- No automated prompt execution against live model APIs — evaluation scores are entered manually
- No SSO/SAML — JWT-based auth only
- No usage telemetry from consuming applications
- No Slack approval notifications
- No self-service taxonomy management UI
