# PromptHub Documentation

**PromptHub** is the enterprise prompt management system that brings software engineering discipline to AI prompts: version control, ownership, testing, approval workflows, and quality measurement.

## What PromptHub solves

| Problem | PromptHub solution |
|---------|-------------------|
| No version control — nobody knows which prompt produced which output | Full immutable version history with diff view |
| No ownership — nobody is accountable when a prompt fails | Every prompt has a named owner and approval chain |
| No testing — prompts ship without validation | Structured test suites with Pass/Fail per test case |
| No approval workflow — anyone uses any prompt | Four-role workflow with enforced separation of duties |
| No quality measurement — output quality is anecdotal | Weighted 5-metric evaluation scores per version |

## Quick start

=== "Consumer"
    1. Go to **Library**
    2. Filter by category, status, or risk level
    3. Click a prompt to see its text, version history, and quality score

=== "Author"
    1. [Register](user-guide.md#register) or sign in
    2. Go to **Library** and click **+ New Prompt**
    3. Fill in all required metadata fields
    4. Create version 1.0 and submit for review

=== "Reviewer"
    1. Find a prompt in **In Review** status
    2. Run the test suite and record results
    3. Complete three evaluation runs
    4. Record all five governance checks
    5. Advance to Testing or return to Draft with comments

=== "Approver"
    1. Review prompts in **Approved** status
    2. Verify evaluation score meets threshold
    3. Promote to Production (auto-retires previous version)

## Navigation

- [User Guide](user-guide.md) — for Consumers and Authors
- [Admin Guide](admin-guide.md) — for Reviewers and Approvers
- [Prompt Design Standards](prompt-design-standards.md) — how to write excellent prompts
- [Architecture](architecture.md) — for engineers integrating with PromptHub
- [API Reference](api-reference.md) — all endpoints
- [FAQ](faq.md)
- [Release Notes](release-notes.md)
