# Prompt Design Standards

Writing an excellent enterprise prompt is a craft. This document defines the standards every PromptHub prompt must meet.

---

## The progression principle

Version history is the proof of craft. The Release Notes Generator in the PromptHub catalog is the canonical example:

| Version | Prompt Text | Quality |
|---------|------------|---------|
| 1.0 | "Write release notes." | Poor |
| 1.1 | "Generate release notes using customer-facing language." | Better |
| 1.2 | "…grouped by feature category, including upgrade impact." | Excellent |
| 1.3 | v1.2 + "Include SaaS deployment notes where applicable." | Excellent |

Each version adds one specific, measurable improvement. If you cannot articulate what changed and why in one sentence, the change is not ready to submit.

---

## Required elements

Every production-quality prompt must include:

### 1. Audience framing
State who will read the output, not just what to generate.

- Poor: "Summarize this document."
- Better: "Summarize this incident report for a non-technical executive audience."

### 2. Output structure
Define the exact format the model should produce.

- Poor: "Write release notes."
- Better: "Generate release notes formatted as: one headline, two-sentence summary, three bullet points grouped by feature category."

### 3. Grounding instructions
Tell the model to stay within the provided context.

- Poor: "Write a risk assessment."
- Better: "Write a risk assessment based strictly on the provided context. Do not introduce external knowledge or assumptions."

### 4. Anti-hallucination patterns (required for Medium and High risk)
- Explicit instruction: "If you are uncertain about a fact, write [UNCERTAIN] instead of guessing."
- Gap flagging: "Flag any missing information as [REQUIRES CLARIFICATION]."
- Scope limit: "Do not include information not present in the provided context."

### 5. Audience-appropriate tone
State the tone explicitly: professional, empathetic, formal, plain-language.

---

## Anti-patterns to avoid

| Anti-pattern | Why it fails | Fix |
|-------------|-------------|-----|
| Vague instructions ("Be helpful") | No measurable output | Define the exact task and format |
| Assuming context the model does not have | Hallucination risk | Pass the context explicitly in the prompt |
| Over-specifying persona ("You are a world-class expert...") | Inflates compliance without improving output | Focus on task, format, and constraints |
| No output format | Inconsistent structure across runs | Always define format explicitly |
| Missing scope limits | Model pulls in external knowledge | Add "based only on the provided context" |

---

## Category-specific standards

### Documentation prompts
- Always specify audience (e.g., "customer-facing", "developer", "executive")
- Define output length or structure explicitly
- Include a tone instruction (e.g., "professional but approachable")

### Support prompts
- Require PII handling instruction: "Do not include personal data beyond what is present in the thread"
- Define escalation scope: what to recommend vs. what to leave blank
- Include structured output format for downstream processing

### Product Management prompts
- Scope the output to the provided input: "base all claims on the brief provided"
- For user stories: require acceptance criteria in Gherkin (Given/When/Then)
- For competitive analysis: "do not introduce external knowledge"

### Compliance prompts
- Always include legal disclaimer: "This output is for informational purposes only and does not constitute legal advice"
- Require flagging of uncertain items: "[LEGAL REVIEW REQUIRED]"
- Scope strictly to provided documents — never allow external knowledge
- All Compliance prompts are High risk by default and require 5 test cases including at least one adversarial case

---

## Scoring your own prompt before submission

Before submitting for review, check your prompt against these criteria (mirror of the evaluation scorecard):

| Self-check | Question |
|-----------|---------|
| Accuracy | If I run this against a real input, will the output be factually correct? |
| Completeness | Does it cover all elements the requester needs? |
| Tone | Is the tone instruction explicit and appropriate for the audience? |
| Hallucination Risk | Have I added grounding and gap-flagging instructions? |
| Formatting | Is the output structure defined precisely enough that two runs produce consistent formats? |

If you cannot answer "yes" to all five, the prompt is not ready for review.
