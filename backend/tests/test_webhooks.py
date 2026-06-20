import hmac

from app.services.webhook_delivery import sign_payload


def _register_and_login(client, username="approver", roles="approver"):
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


def test_approver_can_configure_deployment_webhook(client):
    token = _register_and_login(client)
    resp = client.post("/api/v1/webhooks", headers=_headers(token), json={
        "name": "Production prompt deploy",
        "url": "https://example.com/prompthub",
        "secret": "super-secret",
        "event_type": "prompt.production_deployed",
        "is_active": True,
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Production prompt deploy"
    assert body["url"] == "https://example.com/prompthub"
    assert body["is_active"] is True
    assert "secret" not in body


def test_consumer_cannot_configure_webhooks(client):
    token = _register_and_login(client, username="consumer-webhook", roles="consumer")
    resp = client.post("/api/v1/webhooks", headers=_headers(token), json={
        "name": "Forbidden",
        "url": "https://example.com/prompthub",
        "secret": "super-secret",
    })
    assert resp.status_code == 403


def test_webhook_signature_is_hmac_sha256():
    payload = '{"event":"prompt.production_deployed"}'
    signature = sign_payload("super-secret", payload)
    assert hmac.compare_digest(
        signature,
        "239b8c659ec28e51a1c5658c856c60973eb8aaedd38091b216daff6e81197131",
    )
