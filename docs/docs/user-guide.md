# User Guide

This guide covers everything a **Consumer** or **Author** needs to use PromptHub.

---

## Register and sign in {#register}

1. Navigate to `/login`.
2. If you do not have an account, ask your PromptHub administrator to create one. New accounts default to the Consumer role.
3. Enter your username and password and click **Sign in**.

Your role determines what you can do:

| Role | What you can do |
|------|----------------|
| Consumer | Browse the library, read prompts and scorecards |
| Author | Everything above plus create prompts, create versions, submit for review |
| Reviewer | Everything above plus run tests, record evaluations, advance to Testing |
| Approver | Everything above plus promote to Production, archive, export audit log |

---

## Finding prompts in the Library

The Library is your starting point. Use the filters at the top of the page:

- **Search** — matches prompt name, description, and tags
- **Category** — Documentation, Support, Product Management, Compliance
- **Status** — filter by lifecycle stage
- **Risk** — Low, Medium, High

Click any prompt card to open the **Prompt Detail** page.

---

## Reading a prompt detail page

The detail page has five tabs:

| Tab | Contents |
|-----|----------|
| Overview | Full prompt text for the selected version; diff view if you select a comparison version |
| Tests | All test cases with Pass/Fail/Not Run results and evidence |
| Evaluations | Weighted scorecards for each evaluation run |
| Governance | PII, Compliance, Bias, Hallucination, and Ownership check results |
| History | All versions with status and change summary |

The **quality score** in the top right is the mean of all evaluation runs for the selected version.

---

## Creating a prompt (Authors)

1. Click **+ New Prompt** in the Library header.
2. Fill in all required fields:
    - **Name** — unique, max 120 characters
    - **Description** — what it does and when to use it
    - **Category and Subcategory** — from the taxonomy
    - **Owner** — your user ID (you can transfer ownership later)
    - **Target Model** — the model this prompt is validated against
    - **Risk Level** — defaults to Medium; only Approvers can lower it
    - **Tags** — optional, for discovery
3. Click **Save**. The prompt is created in Draft status.

!!! warning "Metadata requirement"
    A prompt with any missing required field cannot be submitted for review. The form will highlight missing fields.

---

## Creating a new version

1. Open the prompt detail page.
2. Click **+ New Version**.
3. Enter:
    - **Version number** — follow the scheme: X.0 for major changes, X.Y for minor
    - **Prompt text** — the full text of the new version
    - **Change summary** — one sentence describing what changed and why
4. Click **Save**. The new version is created in Draft status.

Previous version's test cases are automatically copied forward as your starting test suite.

---

## Submitting for review

1. Open the version you want to submit.
2. Click **Submit for Review**.
3. If any required metadata is missing, you will see an error listing the missing fields.
4. On success, the version moves to **In Review** and a Reviewer is notified.

---

## Responding to review feedback

If a Reviewer returns your version to Draft with comments:

1. Read the comment in the **History** tab.
2. Edit the prompt text by creating a **new version** (versions cannot be edited after submission).
3. Reference the reviewer's feedback in your change summary.
4. Re-submit for review.

---

## Version diff view

To compare any two versions:

1. Use the **Version** selector to choose the version you want to view.
2. Use the **Compare with** selector to choose a second version.
3. The Overview tab switches to a diff view: split (side by side) or unified (patch format).

---

## Acceptance criteria (Definition of Done for Authors)

A prompt version is complete and ready for review when:

- [ ] All required metadata fields are filled
- [ ] Prompt text is written to the standards in [Prompt Design Standards](prompt-design-standards.md)
- [ ] Version number follows the scheme (X.0 major, X.Y minor)
- [ ] Change summary clearly states what changed and why
- [ ] You have documented at least one example input and expected output in the test suite (Reviewers will add more)
