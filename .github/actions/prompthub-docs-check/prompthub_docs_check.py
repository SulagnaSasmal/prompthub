import json
import os
import pathlib
import sys
import urllib.error
import urllib.request


def changed_markdown_files() -> list[str]:
    explicit = [line.strip() for line in os.getenv("PROMPTHUB_FILES", "").splitlines() if line.strip()]
    if explicit:
        return explicit
    return [str(path) for path in pathlib.Path(".").rglob("*.md") if ".git" not in path.parts]


def post_style_check(api_url: str, token: str, style_profile_id: str, text: str) -> dict:
    payload = json.dumps({"style_profile_id": style_profile_id, "text": text}).encode("utf-8")
    request = urllib.request.Request(
        f"{api_url.rstrip('/')}/api/v1/style-check",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    api_url = os.environ["PROMPTHUB_API_URL"]
    token = os.environ["PROMPTHUB_TOKEN"]
    style_profile_id = os.environ["PROMPTHUB_STYLE_PROFILE_ID"]
    fail_on_error = os.getenv("PROMPTHUB_FAIL_ON_ERROR", "true").lower() == "true"

    files = [file for file in changed_markdown_files() if pathlib.Path(file).exists()]
    if not files:
        print("PromptHub: no Markdown files to check.")
        return 0

    error_count = 0
    for file in files:
        text = pathlib.Path(file).read_text(encoding="utf-8")
        try:
            result = post_style_check(api_url, token, style_profile_id, text)
        except urllib.error.HTTPError as exc:
            print(f"::error file={file}::PromptHub API returned {exc.code}: {exc.read().decode('utf-8')[:300]}")
            return 1
        flags = result.get("flags", [])
        if not flags:
            print(f"PromptHub: {file} passed style check.")
            continue
        for flag in flags:
            severity = flag.get("severity", "warning")
            matched = flag.get("matched_text", flag.get("pattern", "text"))
            message = flag.get("message", "PromptHub style flag")
            line = text[: int(flag.get("start", 0))].count("\n") + 1
            annotation = "error" if severity == "error" else "warning"
            print(f"::{annotation} file={file},line={line}::{matched}: {message}")
            if severity == "error":
                error_count += 1

    if fail_on_error and error_count:
        print(f"PromptHub: {error_count} error-severity style flags found.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
