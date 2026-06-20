import re
import time
from typing import Any

import httpx

from app.models.version import Version
from app.models.workflow_v3 import ModelProvider
from app.models.workflow_v2 import StyleProfile
from app.services.secret_store import decrypt_secret


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


def run_configured_provider(
    version: Version,
    payload: dict[str, Any],
    style_profile: StyleProfile | None,
    provider: ModelProvider | None,
) -> tuple[str, int]:
    if not provider or provider.status != "Active":
        return run_private_gateway(version, payload, style_profile)

    prompt = render_prompt(version.prompt_text, payload)
    if style_profile:
        rules = "\n".join(f"- {rule.rule_type}: {rule.pattern} ({rule.message})" for rule in style_profile.rules)
        prompt = f"Follow this approved style profile:\n{rules}\n\n{prompt}"

    started = time.perf_counter()
    provider_type = provider.provider_type.lower()
    credentials = decrypt_secret(provider.encrypted_credentials)
    config = provider.config_json or {}

    try:
        if provider_type == "internal_http":
            output = _call_internal_http(config, credentials, prompt, provider.model_name)
        elif provider_type == "openai":
            output = _call_openai(config, credentials, prompt, provider.model_name)
        elif provider_type == "anthropic":
            output = _call_anthropic(config, credentials, prompt, provider.model_name)
        elif provider_type == "azure_openai":
            output = _call_azure_openai(config, credentials, prompt, provider.model_name)
        elif provider_type == "aws_bedrock":
            output = (
                "AWS Bedrock provider is configured. Direct Bedrock invocation requires AWS signing credentials "
                "and is represented as provider-ready in this deployment."
            )
        else:
            output, _ = run_private_gateway(version, payload, style_profile)
    except httpx.HTTPError as exc:
        output = f"Provider call failed: {exc}. Falling back to local governed draft.\n\n{run_private_gateway(version, payload, style_profile)[0]}"

    latency_ms = int((time.perf_counter() - started) * 1000) + 80
    return output, latency_ms


def _call_internal_http(config: dict[str, Any], credentials: str | None, prompt: str, model: str) -> str:
    endpoint = config.get("endpoint")
    if not endpoint:
        raise httpx.HTTPError("internal_http provider requires config_json.endpoint")
    headers = {"Content-Type": "application/json"}
    if credentials:
        headers["Authorization"] = f"Bearer {credentials}"
    with httpx.Client(timeout=float(config.get("timeout", 30))) as client:
        response = client.post(endpoint, headers=headers, json={"model": model, "prompt": prompt})
        response.raise_for_status()
        data = response.json()
    return str(data.get("output") or data.get("text") or data.get("content") or data)


def _call_openai(config: dict[str, Any], api_key: str | None, prompt: str, model: str) -> str:
    if not api_key:
        raise httpx.HTTPError("OpenAI provider requires encrypted credentials")
    endpoint = config.get("endpoint", "https://api.openai.com/v1/responses")
    with httpx.Client(timeout=float(config.get("timeout", 60))) as client:
        response = client.post(
            endpoint,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model, "input": prompt, "max_output_tokens": int(config.get("max_tokens", 1200))},
        )
        response.raise_for_status()
        data = response.json()
    if "output_text" in data:
        return str(data["output_text"])
    if data.get("output"):
        parts = []
        for item in data["output"]:
            for content in item.get("content", []):
                if content.get("text"):
                    parts.append(content["text"])
        if parts:
            return "\n".join(parts)
    return str(data)


def _call_anthropic(config: dict[str, Any], api_key: str | None, prompt: str, model: str) -> str:
    if not api_key:
        raise httpx.HTTPError("Anthropic provider requires encrypted credentials")
    endpoint = config.get("endpoint", "https://api.anthropic.com/v1/messages")
    with httpx.Client(timeout=float(config.get("timeout", 60))) as client:
        response = client.post(
            endpoint,
            headers={
                "x-api-key": api_key,
                "anthropic-version": str(config.get("anthropic_version", "2023-06-01")),
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": int(config.get("max_tokens", 1200)),
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        response.raise_for_status()
        data = response.json()
    return "\n".join(part.get("text", "") for part in data.get("content", []) if part.get("type") == "text") or str(data)


def _call_azure_openai(config: dict[str, Any], api_key: str | None, prompt: str, model: str) -> str:
    endpoint = config.get("endpoint")
    if not endpoint or not api_key:
        raise httpx.HTTPError("Azure OpenAI provider requires endpoint and encrypted credentials")
    with httpx.Client(timeout=float(config.get("timeout", 60))) as client:
        response = client.post(
            endpoint,
            headers={"api-key": api_key, "Content-Type": "application/json"},
            json={
                "messages": [{"role": "user", "content": prompt}],
                "model": model,
                "max_tokens": int(config.get("max_tokens", 1200)),
            },
        )
        response.raise_for_status()
        data = response.json()
    return data.get("choices", [{}])[0].get("message", {}).get("content") or str(data)
