import pytest

import pytest

SQL_INJECTION_PAYLOADS = [
    "' OR 1=1--",
    "'; DROP TABLE users; --",
    "\" OR \"\" = \"",
    "'; EXEC xp_cmdshell('dir'); --",
]

@pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
def test_sql_injection_register(client, payload):
    resp = client.post("/register", json={"username": payload, "password": "safePassword123"})
    assert resp.status_code == 400 or resp.status_code == 422

@pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
def test_sql_injection_login(client, payload):
    resp = client.post("/login", json={"username": payload, "password": "any"})
    assert resp.status_code in [400, 401, 404]

@pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
def test_sql_injection_api_params(authenticated_client, payload):
    resp = authenticated_client.get("/api/analysis", query_string={
        "city_id": payload,
        "category_id": "1",
        "radius": 1,
        "rent": 10000,
        "competitors": 5,
        "area_count": 5,
    })
    assert resp.status_code == 400 or resp.status_code == 422

XSS_PAYLOADS = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
]

@pytest.mark.parametrize("payload", XSS_PAYLOADS)
def test_xss_injection_in_registration(client, payload):
    resp = client.post("/register", json={"username": payload, "password": "safePassword123"})
    assert resp.status_code == 400 or resp.status_code == 422

@pytest.mark.parametrize("payload", XSS_PAYLOADS)
def test_xss_injection_in_api(authenticated_client, payload):
    resp = authenticated_client.post("/api/some_endpoint", json={"text_field": payload})
    assert resp.status_code == 400 or resp.status_code == 422 or payload not in resp.get_data(as_text=True)

def test_api_analysis_unauthorized(client):
    resp = client.get("/api/analysis", query_string={
        "city_id": 1,
        "category_id": 1,
        "radius": 1,
        "rent": 10000,
        "competitors": 5,
        "area_count": 5,
    })
    assert resp.status_code == 401
    assert b"Unauthorized" in resp.data or b"Login required" in resp.data

def test_response_security_headers(client):
    response = client.get("/api/cities")
    assert response.status_code == 200
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert "default-src 'self'" in response.headers["Content-Security-Policy"]
