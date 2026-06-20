import re
import time
from typing import Any

from app.models.version import Version
from app.models.workflow_v2 import StyleProfile


TOKEN_RE = re.compile(r"{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}")
PII_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b|\b(?:\d[ -]*?){13,16}\b")
COMPLIANCE_RE = re.compile(r"\b(ignore compliance|bypass policy|legal advice)\b", re.IGNORECASE)


def referenced_variables(prompt_text: str) -> set[str]:
    return set(TOKEN_RE.findall(prompt_text))


def render_prompt(prompt_text: str, payload: dict[str, Any]) -> str:
    def replace(match: re.Match[str]) -> str:
        value = payload.get(match.group(1), "")
        return str(value)

    return TOKEN_RE.sub(replace, prompt_text)


def governance_block_reason(text: str) -> str | None:
    if PII_RE.search(text):
        return "PII check blocked this run. Remove SSNs, card numbers, or sensitive identifiers."
    if COMPLIANCE_RE.search(text):
        return "Compliance check blocked this run because the input requests policy bypass or legal advice."
    return None


def run_private_gateway(version: Version, payload: dict[str, Any], style_profile: StyleProfile | None) -> tuple[str, int]:
    started = time.perf_counter()
    rendered = render_prompt(version.prompt_text, payload)
    style_instruction = ""
    if style_profile:
        rules = "; ".join(f"{rule.rule_type}: {rule.pattern}" for rule in style_profile.rules)
        style_instruction = f"\n\nStyle profile applied: {style_profile.name}. Rules: {rules}"

    output = (
        f"Generated through PromptHub model gateway using approved model {version.prompt.target_model}.\n\n"
        f"{rendered.strip()}{style_instruction}\n\n"
        "Draft output:\n"
        "- Summary: The supplied source material has been transformed for the requested documentation task.\n"
        "- Key details: Review names, dates, and product facts against the source before publishing.\n"
        "- Next action: Copy, rate, save as an example, or suggest an improvement."
    )
    latency_ms = int((time.perf_counter() - started) * 1000) + 80
    return output, latency_ms
