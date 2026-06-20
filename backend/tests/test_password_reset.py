def test_password_reset_flow(client):
    client.post("/api/v1/auth/register", json={
        "username": "reset-user",
        "email": "reset-user@test.com",
        "password": "oldpass123",
        "roles": "consumer",
    })

    forgot = client.post("/api/v1/auth/forgot-password", json={"email": "reset-user@test.com"})
    assert forgot.status_code == 200
    token = forgot.json()["reset_token"]
    assert token

    reset = client.post("/api/v1/auth/reset-password", json={
        "token": token,
        "new_password": "newpass123",
    })
    assert reset.status_code == 200

    old_login = client.post("/api/v1/auth/login", json={"username": "reset-user", "password": "oldpass123"})
    assert old_login.status_code == 401

    new_login = client.post("/api/v1/auth/login", json={"username": "reset-user", "password": "newpass123"})
    assert new_login.status_code == 200


def test_password_reset_is_single_use(client):
    client.post("/api/v1/auth/register", json={
        "username": "single-use",
        "email": "single-use@test.com",
        "password": "oldpass123",
        "roles": "consumer",
    })
    token = client.post("/api/v1/auth/forgot-password", json={"email": "single-use@test.com"}).json()["reset_token"]
    first = client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "newpass123"})
    second = client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "otherpass123"})
    assert first.status_code == 200
    assert second.status_code == 400
