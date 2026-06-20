def _register_and_login(client, username="v3user", roles="author,reviewer,approver"):
    client.post("/api/v1/auth/register", json={
        "username": username,
        "email": f"{username}@test.com",
        "password": "testpass123",
        "roles": roles,
    })
    resp = client.post("/api/v1/auth/login", json={"username": username, "password": "testpass123"})
    return resp.json()["access_token"]


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def _create_workflow_version(client, token):
    prompt_resp = client.post("/api/v1/prompts", headers=_headers(token), json={
        "name": "V3 Release Notes Workflow",
        "description": "Generate release notes from source material",
        "category": "Documentation",
        "subcategory": "Release Notes",
        "target_model": "GPT-5",
        "risk_level": "Medium",
        "task_type": "Release Notes",
        "usage_notes": "Use with merged PRs or Jira release tickets.",
        "tags": ["release", "docs"],
    })
    prompt_id = prompt_resp.json()["prompt_id"]
    version_resp = client.post(f"/api/v1/prompts/{prompt_id}/versions", headers=_headers(token), json={
        "version_number": "1.0",
        "prompt_text": "Draft release notes from {{source_text}}",
        "change_summary": "Initial runnable workflow",
    })
    return prompt_id, version_resp.json()["version_id"]


def test_v3_integrations_review_queue_and_markdown_export(client):
    token = _register_and_login(client)
    prompt_id, version_id = _create_workflow_version(client, token)

    integrations = client.get("/api/v1/integrations", headers=_headers(token))
    assert integrations.status_code == 200
    assert {item["source"] for item in integrations.json()} >= {"markdown", "github", "jira", "openapi"}

    fetched = client.post("/api/v1/integrations/markdown/fetch", headers=_headers(token), json={
        "locator": "pasted-markdown",
        "content": "## Added\n\nNew dashboard export.",
    })
    assert fetched.status_code == 200
    assert "New dashboard export" in fetched.json()["content"]

    variable_resp = client.post(f"/api/v1/versions/{version_id}/variables", headers=_headers(token), json=[{
        "name": "source_text",
        "label": "Source text",
        "help_text": "Paste source material.",
        "var_type": "long-text",
        "required": True,
        "example_value": "Feature list",
        "options": [],
    }])
    assert variable_resp.status_code == 201

    run_resp = client.post(f"/api/v1/versions/{version_id}/run", headers=_headers(token), json={
        "input_payload": {"source_text": "New dashboard export."},
        "apply_style_profile": False,
    })
    assert run_resp.status_code == 200
    run_id = run_resp.json()["run_id"]

    export_resp = client.post(f"/api/v1/runs/{run_id}/export", headers=_headers(token))
    assert export_resp.status_code == 200
    assert export_resp.json()["filename"].endswith(".md")
    assert "## Output" in export_resp.json()["content"]

    transition_resp = client.post(f"/api/v1/versions/{version_id}/transition", headers=_headers(token), json={
        "to_status": "In Review",
        "comment": "Ready for review queue",
    })
    assert transition_resp.status_code == 200

    queue_resp = client.get("/api/v1/review-queue", headers=_headers(token))
    assert queue_resp.status_code == 200
    assert any(item["prompt_id"] == prompt_id for item in queue_resp.json())
