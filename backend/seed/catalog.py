"""
Seed script: loads 25 enterprise prompts across all four categories with full metadata,
versions (following the spec's progression pattern), evaluations, test suites, and governance checks.

Run:  python -m seed.catalog
Requires DATABASE_URL env var pointing to a running PostgreSQL instance.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from datetime import datetime, timezone
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.user import User
from app.models.prompt import Prompt
from app.models.version import Version
from app.models.evaluation import Evaluation
from app.models.test_case import TestCase
from app.models.governance import GovernanceCheck
from app.models.workflow_log import WorkflowLog
from app.models.workflow_v2 import Example, Variable

Base.metadata.create_all(bind=engine)

DEMO_PROMPTS = [
    {
        "name": "Demo: Release Notes from Jira Tickets",
        "description": "Turns a list of Jira issues into customer-facing release notes for a SaaS documentation team.",
        "category": "Documentation",
        "subcategory": "Release Notes",
        "target_model": "GPT-5",
        "risk_level": "Low",
        "tags": ["demo", "technical-writing", "jira", "release-notes"],
        "usage_notes": "Start here during demos: paste three to five Jira summaries and generate a polished release-note draft.",
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Create customer-facing release notes from the Jira source material. "
                    "Group updates by Added, Changed, Fixed, and Known Issues. "
                    "Use plain language, avoid internal ticket jargon, and include one upgrade-impact note when relevant."
                ),
                "summary": "Demo workflow for release note generation",
            },
        ],
    },
    {
        "name": "Demo: API Change Explainer",
        "description": "Explains API changes from an OpenAPI diff for developer documentation and migration guides.",
        "category": "Documentation",
        "subcategory": "API Summaries",
        "target_model": "GPT-5",
        "risk_level": "Medium",
        "tags": ["demo", "openapi", "developer-docs", "migration"],
        "usage_notes": "Use this to show how source references and OpenAPI diffs become reviewable developer-facing guidance.",
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Explain the API changes in the source material for developers. "
                    "Return: Summary, Added Endpoints, Removed Endpoints, Behavior Changes, Migration Steps, and Documentation Gaps. "
                    "Do not invent endpoints that are not present in the source."
                ),
                "summary": "Demo workflow for API change documentation",
            },
        ],
    },
    {
        "name": "Demo: Support Thread to KB Article",
        "description": "Converts a resolved support conversation into a reusable customer knowledge base article.",
        "category": "Support",
        "subcategory": "KB Article",
        "target_model": "GPT-5",
        "risk_level": "Medium",
        "tags": ["demo", "support", "kb", "customer-success"],
        "usage_notes": "Use this to demonstrate support, review, privacy, and field-quality workflows in one path.",
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Convert the resolved support thread into a knowledge base article. "
                    "Include Title, Symptoms, Environment, Cause, Resolution, Verification, and Related Links. "
                    "Remove private customer identifiers and flag any missing technical detail as [NEEDS REVIEW]."
                ),
                "summary": "Demo workflow for support-to-KB conversion",
            },
        ],
    },
]


PROMPTS_DATA = [
    # ── DOCUMENTATION ──────────────────────────────────────────────────────────
    {
        "name": "Release Note Generator",
        "description": "Generates customer-facing release notes from a list of engineering features and fixes.",
        "category": "Documentation",
        "subcategory": "Release Notes",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "Low",
        "tags": ["release", "saas", "docs"],
        "versions": [
            {"number": "1.0", "text": "Write release notes.", "summary": "Initial draft"},
            {"number": "1.1", "text": "Generate release notes using customer-facing language.", "summary": "Added audience framing"},
            {
                "number": "1.2",
                "text": (
                    "Generate release notes using customer-facing language, grouped by feature category, "
                    "including upgrade impact."
                ),
                "summary": "Added feature grouping and upgrade impact",
            },
            {
                "number": "1.3",
                "text": (
                    "Generate release notes using customer-facing language, grouped by feature category, "
                    "including upgrade impact. Include SaaS deployment notes where applicable."
                ),
                "summary": "Added SaaS deployment notes",
            },
        ],
    },
    {
        "name": "API Reference Summarizer",
        "description": "Condenses verbose OpenAPI specs into plain-language summaries for developer portals.",
        "category": "Documentation",
        "subcategory": "API Summaries",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "Low",
        "tags": ["api", "docs", "developer"],
        "versions": [
            {"number": "1.0", "text": "Summarize this API specification.", "summary": "Initial"},
            {
                "number": "1.1",
                "text": (
                    "Summarize this OpenAPI specification in plain English for a developer audience. "
                    "Cover: endpoints, authentication, rate limits, and key response codes."
                ),
                "summary": "Added structured output requirements",
            },
        ],
    },
    {
        "name": "Installation Guide Drafter",
        "description": "Drafts step-by-step installation guides from engineering runbooks.",
        "category": "Documentation",
        "subcategory": "Installation Guide Drafts",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "Low",
        "tags": ["installation", "docs", "onboarding"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Draft an installation guide from the following runbook. "
                    "Use numbered steps, include prerequisites, and highlight warnings."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "What's New Announcer",
        "description": "Writes product What's New posts for in-app announcements and email newsletters.",
        "category": "Documentation",
        "subcategory": "What's New",
        "target_model": "claude-opus-4-8",
        "risk_level": "Low",
        "tags": ["whats-new", "marketing", "docs"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Write a What's New announcement for the following product update. "
                    "Tone: enthusiastic but professional. Format: two paragraphs + three bullet points. "
                    "Focus on customer value, not technical detail."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "Changelog Entry Writer",
        "description": "Converts git commit messages into structured, human-readable changelog entries.",
        "category": "Documentation",
        "subcategory": "Release Notes",
        "target_model": "claude-haiku-4-5-20251001",
        "risk_level": "Low",
        "tags": ["changelog", "git", "automation"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Convert the following git commit messages into changelog entries grouped as: "
                    "Added / Changed / Fixed / Deprecated / Removed / Security. "
                    "Use imperative mood. Omit internal refactors and test-only commits."
                ),
                "summary": "Initial",
            },
        ],
    },
    # ── SUPPORT ────────────────────────────────────────────────────────────────
    {
        "name": "Support Case Summarizer",
        "description": "Summarizes long support ticket threads into structured case summaries for escalation handoffs.",
        "category": "Support",
        "subcategory": "Case Summaries",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "Medium",
        "tags": ["support", "escalation", "crm"],
        "versions": [
            {
                "number": "1.0",
                "text": "Summarize this support ticket.",
                "summary": "Initial",
            },
            {
                "number": "1.1",
                "text": (
                    "Summarize the following support ticket thread. Output:\n"
                    "- Customer: (name and account tier)\n"
                    "- Issue: (one sentence)\n"
                    "- Steps taken: (bulleted list)\n"
                    "- Current status: (one sentence)\n"
                    "- Recommended next action: (one sentence)\n"
                    "Do not include personal data beyond what is in the thread."
                ),
                "summary": "Added structured output format and PII guidance",
            },
        ],
    },
    {
        "name": "Escalation Analyzer",
        "description": "Identifies escalation risk signals in support threads and recommends routing.",
        "category": "Support",
        "subcategory": "Escalation Analysis",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "Medium",
        "tags": ["escalation", "churn", "support"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Analyze the following support thread for escalation risk. "
                    "Score risk Low / Medium / High and explain the top three signals. "
                    "Recommend: handle at tier 1, escalate to tier 2, or executive escalation."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "Root Cause Analysis Generator",
        "description": "Produces structured RCA documents from incident timelines and engineer notes.",
        "category": "Support",
        "subcategory": "RCA Generation",
        "target_model": "claude-opus-4-8",
        "risk_level": "High",
        "tags": ["rca", "incident", "postmortem", "sre"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Draft a root cause analysis from the following incident timeline. "
                    "Sections: Incident Summary, Timeline, Root Cause, Contributing Factors, "
                    "Impact Assessment, Corrective Actions (immediate and long-term). "
                    "Do not speculate beyond the evidence provided. "
                    "Flag any gap in the timeline as '[UNKNOWN — requires investigation]'."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "Customer Sentiment Classifier",
        "description": "Classifies customer feedback into sentiment categories with urgency scoring.",
        "category": "Support",
        "subcategory": "Case Summaries",
        "target_model": "claude-haiku-4-5-20251001",
        "risk_level": "Low",
        "tags": ["sentiment", "nps", "support", "analytics"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Classify the following customer feedback. Return JSON: "
                    '{"sentiment": "Positive|Neutral|Negative|Mixed", '
                    '"urgency": "Low|Medium|High", '
                    '"themes": ["theme1", "theme2"], '
                    '"suggested_action": "string"}. '
                    "Respond only with the JSON object."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "Knowledge Base Article Generator",
        "description": "Drafts KB articles from resolved ticket threads to reduce repeat contact.",
        "category": "Support",
        "subcategory": "Case Summaries",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "Low",
        "tags": ["kb", "self-service", "support"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Create a knowledge base article from the following resolved support ticket. "
                    "Format: Title, Applies To (product/version), Problem Statement, Solution (numbered steps), "
                    "Related Articles. Tone: concise and instructional."
                ),
                "summary": "Initial",
            },
        ],
    },
    # ── PRODUCT MANAGEMENT ────────────────────────────────────────────────────
    {
        "name": "Feature Description Writer",
        "description": "Transforms engineering feature specs into marketing-ready feature descriptions.",
        "category": "Product Management",
        "subcategory": "Feature Descriptions",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "Low",
        "tags": ["product", "marketing", "features"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Write a feature description for the following engineering spec. "
                    "Audience: business buyers. Tone: benefit-first, no jargon. "
                    "Format: one headline (max 10 words), two-sentence summary, three bullet benefits."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "User Story Generator",
        "description": "Generates well-formed Agile user stories with acceptance criteria from product briefs.",
        "category": "Product Management",
        "subcategory": "User Stories",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "Low",
        "tags": ["agile", "user-story", "product"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Generate Agile user stories from the following product brief. "
                    "Format each as: As a [persona], I want [action] so that [benefit]. "
                    "Include 3 to 5 acceptance criteria per story in Gherkin format (Given/When/Then). "
                    "Flag any ambiguity in the brief as a question."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "Acceptance Criteria Refiner",
        "description": "Converts vague acceptance criteria into testable, unambiguous statements.",
        "category": "Product Management",
        "subcategory": "Acceptance Criteria",
        "target_model": "claude-haiku-4-5-20251001",
        "risk_level": "Low",
        "tags": ["qa", "acceptance-criteria", "agile"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Refine the following acceptance criteria so each item is: "
                    "testable (has a clear pass/fail condition), "
                    "unambiguous (no subjective terms like 'fast' or 'easy'), "
                    "and independent (each criterion can be verified separately). "
                    "Return the refined list with a note on any that could not be made testable."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "Competitive Analysis Summarizer",
        "description": "Synthesizes competitor research into structured comparison tables and insight summaries.",
        "category": "Product Management",
        "subcategory": "Feature Descriptions",
        "target_model": "claude-opus-4-8",
        "risk_level": "Medium",
        "tags": ["competitive", "strategy", "product"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Synthesize the following competitor research into: "
                    "1) A feature comparison table (our product vs. each competitor). "
                    "2) Three strategic insights (where we lead, where we lag, and one opportunity). "
                    "Base all claims strictly on the provided research. Do not introduce external knowledge."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "Sprint Retrospective Facilitator",
        "description": "Summarizes retrospective inputs into themed action items and team health signals.",
        "category": "Product Management",
        "subcategory": "User Stories",
        "target_model": "claude-haiku-4-5-20251001",
        "risk_level": "Low",
        "tags": ["agile", "retrospective", "team"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Summarize the following sprint retrospective inputs. "
                    "Group themes under: What went well / What needs improvement / Action items. "
                    "Assign each action item an owner category (Engineering / Process / Leadership) "
                    "and a priority (High / Medium / Low)."
                ),
                "summary": "Initial",
            },
        ],
    },
    # ── COMPLIANCE ────────────────────────────────────────────────────────────
    {
        "name": "Policy Summary Generator",
        "description": "Produces plain-language summaries of regulatory policies for non-legal audiences.",
        "category": "Compliance",
        "subcategory": "Policy Summaries",
        "target_model": "claude-opus-4-8",
        "risk_level": "High",
        "tags": ["compliance", "policy", "legal", "plain-language"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Summarize the following regulatory policy in plain language for a non-legal audience. "
                    "Cover: who it applies to, key obligations, key prohibitions, and penalties for non-compliance. "
                    "Do not interpret or advise. Flag any section requiring legal review with [LEGAL REVIEW REQUIRED]. "
                    "This summary is for informational purposes only and does not constitute legal advice."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "Data Processing Agreement Checker",
        "description": "Reviews DPAs against a compliance checklist and flags gaps.",
        "category": "Compliance",
        "subcategory": "Risk Analysis",
        "target_model": "claude-opus-4-8",
        "risk_level": "High",
        "tags": ["dpa", "gdpr", "privacy", "compliance"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Review the following Data Processing Agreement against this checklist: "
                    "sub-processor list present, data retention periods specified, "
                    "breach notification timelines (must be ≤72 hours for GDPR), "
                    "data subject rights procedures, cross-border transfer mechanisms. "
                    "For each item: Pass, Partial, or Fail — with the relevant clause reference. "
                    "This review is not legal advice."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "Risk Assessment Narratives",
        "description": "Generates structured risk assessment narratives for InfoSec and compliance teams.",
        "category": "Compliance",
        "subcategory": "Risk Analysis",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "High",
        "tags": ["risk", "infosec", "iso27001", "compliance"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Write a risk assessment narrative for the following risk item. "
                    "Format: Risk Description, Likelihood (1-5), Impact (1-5), Risk Rating (L×I), "
                    "Existing Controls, Residual Risk, Recommended Treatment. "
                    "Base all ratings on the provided context only."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "Audit Finding Formatter",
        "description": "Converts raw audit notes into structured, regulator-ready audit findings.",
        "category": "Compliance",
        "subcategory": "Risk Analysis",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "High",
        "tags": ["audit", "sox", "compliance", "fintech"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Format the following audit note as a structured audit finding: "
                    "Finding ID, Title, Criteria (what standard or policy was expected), "
                    "Condition (what was observed), Cause, Effect, "
                    "Recommendation, Management Response (leave blank). "
                    "Use formal, objective language."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "Vendor Risk Questionnaire Analyzer",
        "description": "Reviews vendor security questionnaire responses and surfaces gaps against baseline controls.",
        "category": "Compliance",
        "subcategory": "Risk Analysis",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "High",
        "tags": ["vendor-risk", "third-party", "infosec", "compliance"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Review the following vendor security questionnaire response. "
                    "Identify: gaps against SOC 2 Type II baseline controls, "
                    "inconsistencies or vague answers that require follow-up, "
                    "and any red flags (e.g. no encryption at rest, no MFA, no pen test in 24 months). "
                    "Output a prioritized list of follow-up questions."
                ),
                "summary": "Initial",
            },
        ],
    },
    # ── BONUS CROSS-CATEGORY PROMPTS ───────────────────────────────────────────
    {
        "name": "Executive Briefing Summarizer",
        "description": "Condenses long reports into executive-level briefings with key decisions highlighted.",
        "category": "Documentation",
        "subcategory": "API Summaries",
        "target_model": "claude-opus-4-8",
        "risk_level": "Medium",
        "tags": ["executive", "summary", "briefing"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Summarize the following report for a C-level audience. "
                    "Format: Situation (2 sentences), Key Findings (3 bullets), "
                    "Decision Required (1 sentence), Recommended Action (1 sentence), "
                    "Risks if No Action (1 sentence). Maximum 200 words total."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "Email Response Drafter",
        "description": "Drafts professional email responses from thread context and intended tone.",
        "category": "Support",
        "subcategory": "Case Summaries",
        "target_model": "claude-haiku-4-5-20251001",
        "risk_level": "Low",
        "tags": ["email", "communication", "support"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Draft a professional email response to the following thread. "
                    "Tone: {tone} (e.g. empathetic, firm, apologetic). "
                    "Include: acknowledgment of the issue, what we are doing, and next step with timeline. "
                    "Do not make commitments that are not in the context provided."
                ),
                "summary": "Initial with tone variable",
            },
        ],
    },
    {
        "name": "Meeting Notes Formatter",
        "description": "Converts raw meeting transcripts into structured notes with action items and owners.",
        "category": "Documentation",
        "subcategory": "What's New",
        "target_model": "claude-haiku-4-5-20251001",
        "risk_level": "Low",
        "tags": ["meetings", "productivity", "notes"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Convert the following meeting transcript into structured meeting notes. "
                    "Format: Date & Attendees, Key Decisions (numbered), "
                    "Action Items (Owner | Task | Due Date), Parking Lot (unresolved items). "
                    "Remove filler language and false starts."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "Job Description Bias Reviewer",
        "description": "Reviews job descriptions for biased language and suggests inclusive alternatives.",
        "category": "Compliance",
        "subcategory": "Risk Analysis",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "Medium",
        "tags": ["dei", "hiring", "bias", "hr"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Review the following job description for potentially biased language. "
                    "Check for: gendered words (e.g. 'rockstar', 'ninja'), "
                    "unnecessary requirements (e.g. 'must have degree'), "
                    "exclusionary culture signals. "
                    "For each issue: quote the text, explain the concern, suggest an inclusive alternative."
                ),
                "summary": "Initial",
            },
        ],
    },
    {
        "name": "Data Dictionary Entry Generator",
        "description": "Generates standardized data dictionary entries from column names and sample values.",
        "category": "Documentation",
        "subcategory": "API Summaries",
        "target_model": "claude-haiku-4-5-20251001",
        "risk_level": "Low",
        "tags": ["data", "dictionary", "governance", "analytics"],
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Generate a data dictionary entry for each of the following database columns. "
                    "For each column, provide: Column Name, Data Type, Description (one sentence), "
                    "Example Values, Nullability, PII flag (Yes/No/Partial), "
                    "and Source System. Base descriptions on the column name and sample values provided."
                ),
                "summary": "Initial",
            },
        ],
    },
]


COMMUNITY_PROMPTS = [
    {
        "name": "Community Prompt Improver",
        "description": "Rewrites a rough prompt into a clearer, testable, governed workflow prompt.",
        "category": "Documentation",
        "subcategory": "Prompt Improvement",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "Low",
        "tags": ["community-seed", "prompt-improvement", "prompts.chat", "the-prompt-library"],
        "usage_notes": (
            "Seeded from public prompt-library patterns observed in f/prompts.chat (CC0 prompt data) "
            "and JuliusBrussee/the-prompt-library (MIT). Template text is original to PromptHub."
        ),
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Improve the following draft prompt so it is specific, reusable, and testable. "
                    "Return: Purpose, Required Inputs, Improved Prompt, Expected Output Shape, "
                    "Failure Modes, and Test Ideas. Preserve the author's intent and do not add hidden requirements."
                ),
                "summary": "Community seed for prompt refinement",
            },
        ],
    },
    {
        "name": "Repository Activity Summarizer",
        "description": "Summarizes repository commits, pull requests, and issues into a documentation-ready activity brief.",
        "category": "Documentation",
        "subcategory": "Repository Summary",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "Low",
        "tags": ["community-seed", "github", "repository", "activity-summary"],
        "usage_notes": (
            "Inspired by GitHub prompt-file use cases for summarizing repository activity. "
            "Template text is original to PromptHub."
        ),
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Summarize the repository activity below for a documentation lead. "
                    "Group by Features, Fixes, Breaking Changes, Docs Impact, and Open Risks. "
                    "Cite source identifiers when present. Do not infer shipped behavior from unmerged work."
                ),
                "summary": "Community seed for repo activity documentation",
            },
        ],
    },
    {
        "name": "Technical Draft Clarity Rewrite",
        "description": "Turns a dense technical draft into clearer documentation while preserving facts and constraints.",
        "category": "Documentation",
        "subcategory": "Tone Rewrite",
        "target_model": "claude-haiku-4-5-20251001",
        "risk_level": "Low",
        "tags": ["community-seed", "technical-writing", "clarity", "rewrite"],
        "usage_notes": (
            "Seeded from common open prompt-library rewrite and technical-writing patterns. "
            "Template text is original to PromptHub."
        ),
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Rewrite the draft below for a technical documentation audience. "
                    "Keep every factual constraint, remove filler, define ambiguous terms, "
                    "and return a concise version plus a list of assumptions that need review."
                ),
                "summary": "Community seed for technical clarity rewrites",
            },
        ],
    },
    {
        "name": "Bug Report to KB Article",
        "description": "Transforms a resolved bug report or support thread into a customer-facing knowledge base article.",
        "category": "Support",
        "subcategory": "KB Article",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "Medium",
        "tags": ["community-seed", "support", "kb", "bug-report"],
        "usage_notes": (
            "Seeded from public prompt-library task categories around support, summarization, and content drafting. "
            "Template text is original to PromptHub."
        ),
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Convert the resolved bug report below into a knowledge base article. "
                    "Include: Title, Symptoms, Cause, Affected Versions, Resolution, Workaround, "
                    "Verification Steps, and Related Links. Do not expose private customer data."
                ),
                "summary": "Community seed for support-to-KB workflows",
            },
        ],
    },
    {
        "name": "Migration Plan Drafter",
        "description": "Drafts a stepwise migration plan from release notes, breaking changes, or upgrade requirements.",
        "category": "Documentation",
        "subcategory": "Migration Guide",
        "target_model": "claude-sonnet-4-6",
        "risk_level": "Medium",
        "tags": ["community-seed", "migration", "upgrade", "developer-docs"],
        "usage_notes": (
            "Seeded from common open prompt-library planning and developer-documentation patterns. "
            "Template text is original to PromptHub."
        ),
        "versions": [
            {
                "number": "1.0",
                "text": (
                    "Draft a migration plan from the source material below. "
                    "Return: Audience, Preconditions, Step-by-step Plan, Validation Checks, Rollback Plan, "
                    "Known Risks, and Documentation Gaps. Flag any missing information as [NEEDS OWNER]."
                ),
                "summary": "Community seed for migration planning workflows",
            },
        ],
    },
]


def _task_type(prompt_name: str, subcategory: str) -> str:
    text = f"{prompt_name} {subcategory}".lower()
    if "release" in text or "changelog" in text or "what's new" in text:
        return "Release Notes"
    if "api" in text:
        return "API Summary"
    if "installation" in text:
        return "Migration Guide"
    if "knowledge base" in text or "kb" in text:
        return "KB Article"
    if "tone" in text or "email" in text:
        return "Tone Rewrite"
    if "bias" in text or "policy" in text or "compliance" in text:
        return "Style Check"
    return "Documentation Draft"


def _ensure_runnable_seed(db, prompt: Prompt, version: Version):
    prompt.task_type = _task_type(prompt.name, prompt.subcategory)
    prompt.usage_notes = prompt.usage_notes or f"Use this workflow for {prompt.subcategory.lower()} writing tasks."
    if "{{source_material}}" not in version.prompt_text:
        version.prompt_text = f"{version.prompt_text}\n\nSource material:\n{{{{source_material}}}}"
    if not version.variables:
        db.add(
            Variable(
                version_id=version.version_id,
                name="source_material",
                label="Source material",
                help_text="Paste the Jira ticket, Markdown, diff, ticket thread, or source notes to transform.",
                var_type="source-reference",
                required=True,
                example_value=f"Sample source material for {prompt.name}",
            )
        )
    if not version.examples:
        db.add(
            Example(
                version_id=version.version_id,
                input_payload={"source_material": f"Sample source material for {prompt.name}."},
                output_text=f"Example output for {prompt.name}: concise, accurate, and ready for documentation review.",
                note="Seeded good-output example for the v2 runnable workflow library.",
            )
        )


def seed():
    db = SessionLocal()
    try:
        # Create users
        users = {}
        for role_set, name, email in [
            ("admin,author,reviewer,approver", "admin", "admin@prompthub.internal"),
            ("author", "author1", "author1@prompthub.internal"),
            ("reviewer", "reviewer1", "reviewer1@prompthub.internal"),
            ("approver", "approver1", "approver1@prompthub.internal"),
            ("consumer", "consumer1", "consumer1@prompthub.internal"),
        ]:
            existing = db.query(User).filter(User.username == name).first()
            if existing:
                users[name] = existing
                continue
            u = User(
                username=name,
                email=email,
                hashed_password=hash_password("Prompthub2026!"),
                full_name=name.title(),
                roles=role_set,
            )
            db.add(u)
            db.flush()
            users[name] = u
        db.commit()

        author = users["author1"]
        reviewer = users["reviewer1"]
        approver = users["approver1"]

        for pd in DEMO_PROMPTS + PROMPTS_DATA + COMMUNITY_PROMPTS:
            existing = db.query(Prompt).filter(Prompt.name == pd["name"]).first()
            if existing:
                print(f"  Skip (exists): {pd['name']}")
                continue

            prompt = Prompt(
                name=pd["name"],
                description=pd["description"],
                category=pd["category"],
                subcategory=pd["subcategory"],
                owner_id=author.user_id,
                target_model=pd["target_model"],
                risk_level=pd["risk_level"],
                tags=pd["tags"],
                usage_notes=pd.get("usage_notes", ""),
                created_by=author.user_id,
                status="Draft",
            )
            db.add(prompt)
            db.flush()

            for i, vd in enumerate(pd["versions"]):
                is_last = i == len(pd["versions"]) - 1
                status = "Production" if is_last else "Retired"

                v = Version(
                    prompt_id=prompt.prompt_id,
                    version_number=vd["number"],
                    prompt_text=vd["text"],
                    change_summary=vd["summary"],
                    created_by=author.user_id,
                    status=status,
                    submitted_at=datetime.now(timezone.utc),
                )
                db.add(v)
                db.flush()

                if is_last:
                    prompt.current_version = vd["number"]
                    prompt.status = "Production"
                    _ensure_runnable_seed(db, prompt, v)

                    # Add evaluations (3 runs)
                    base_scores = {
                        "High": (9, 8, 9, 8, 9),
                        "Medium": (8, 8, 8, 7, 8),
                        "Low": (8, 7, 8, 8, 7),
                    }
                    bs = base_scores.get(pd["risk_level"], (8, 7, 8, 7, 8))
                    for run in range(1, 4):
                        overall = round(
                            bs[0] * 10 * 0.30 +
                            bs[1] * 10 * 0.25 +
                            bs[2] * 10 * 0.15 +
                            bs[3] * 10 * 0.20 +
                            bs[4] * 10 * 0.10, 2
                        )
                        ev = Evaluation(
                            version_id=v.version_id,
                            run_number=run,
                            accuracy_score=bs[0],
                            completeness_score=bs[1],
                            tone_score=bs[2],
                            hallucination_score=bs[3],
                            formatting_score=bs[4],
                            overall_score=overall,
                            evaluated_by=reviewer.user_id,
                        )
                        db.add(ev)

                    # Add test cases
                    tc_count = 5 if pd["risk_level"] == "High" else 3
                    for tc_i in range(tc_count):
                        is_adversarial = tc_i == tc_count - 1 and pd["risk_level"] == "High"
                        tc = TestCase(
                            version_id=v.version_id,
                            name="adversarial: malicious input injection" if is_adversarial else f"Test case {tc_i + 1}",
                            input=f"Sample input {tc_i + 1} for {pd['name']}",
                            expected_behavior=f"Expected output {tc_i + 1}",
                            result="Pass",
                            evidence="Verified in evaluation run",
                            tested_by=reviewer.user_id,
                            tested_at=datetime.now(timezone.utc),
                        )
                        db.add(tc)

                    # Governance checks
                    for check_type in ["PII", "Compliance", "Ownership"]:
                        gc = GovernanceCheck(
                            version_id=v.version_id,
                            check_type=check_type,
                            result="Pass",
                            notes=f"{check_type} check passed for {pd['name']}",
                            checked_by=reviewer.user_id,
                        )
                        db.add(gc)

                    # Workflow log
                    for from_s, to_s in [
                        (None, "Draft"),
                        ("Draft", "In Review"),
                        ("In Review", "Testing"),
                        ("Testing", "Approved"),
                        ("Approved", "Production"),
                    ]:
                        wl = WorkflowLog(
                            version_id=v.version_id,
                            from_status=from_s,
                            to_status=to_s,
                            actor_id=approver.user_id,
                            comment=f"Promoted to {to_s}",
                        )
                        db.add(wl)

            db.commit()
            print(f"  Seeded: {pd['name']} ({len(pd['versions'])} version(s))")

        for prompt in db.query(Prompt).all():
            current = next((v for v in prompt.versions if v.version_number == prompt.current_version), None)
            if current:
                _ensure_runnable_seed(db, prompt, current)
        db.commit()

    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding PromptHub catalog...")
    seed()
    print("Done. PromptHub catalog seed complete.")
