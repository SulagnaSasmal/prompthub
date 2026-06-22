SENSITIVE_KEY_PARTS = {
    "authorization",
    "client_secret",
    "content",
    "credentials",
    "input_payload",
    "new_password",
    "output_text",
    "password",
    "raw_token",
    "secret",
    "token",
}


def redact_sensitive(value):
    if isinstance(value, dict):
        redacted = {}
        for key, item in value.items():
            key_text = str(key).lower()
            if any(part in key_text for part in SENSITIVE_KEY_PARTS):
                redacted[key] = "[REDACTED]"
            else:
                redacted[key] = redact_sensitive(item)
        return redacted
    if isinstance(value, list):
        return [redact_sensitive(item) for item in value]
    return value
