from app.models import User
from werkzeug.security import check_password_hash
import datetime


def test_register_new_user(client):
    response = client.post(
        "/register", json={"username": "newuser", "password": "newpassword"}
    )
    assert response.status_code == 200
    assert response.json["message"] == "Registered!"

    user = User.query.filter_by(username="newuser").first()
    assert user is not None
    assert check_password_hash(user.password, "newpassword")

    with client.session_transaction() as sess:
        assert "_user_id" in sess
        assert sess["_user_id"] == str(user.id)


def test_register_existing_user(client):
    username = "testuser_existing"
    client.post("/register", json={"username": username, "password": "password"})
    response = client.post(
        "/register", json={"username": username, "password": "password"}
    )
    assert response.status_code == 400
    assert response.json["error"] == "Already logged in"


def test_register_duplicate_username(client):
    response1 = client.post(
        "/register", json={"username": "user1", "password": "qweqwe1"}
    )
    assert response1.status_code == 200

    response_logout = client.post("/logout")
    assert response_logout.status_code == 200

    response2 = client.post(
        "/register", json={"username": "user1", "password": "qweqwe2"}
    )
    assert response2.status_code == 400
    assert response2.json["error"] == "User already exists"


def test_register_when_already_logged_in(logged_in_client):
    response = logged_in_client.post(
        "/register", json={"username": "anotheruser", "password": "qweqwe3"}
    )
    assert response.status_code == 400
    assert response.json["error"] == "Already logged in"


def test_login_correct_credentials(client, test_user):
    response = client.post(
        "/login", json={"username": test_user.username, "password": "password"}
    )
    assert response.status_code == 200
    assert response.json["message"] == "Logged in!"

    client.get("/api/history")

    with client.session_transaction() as sess:
        assert "_user_id" in sess
        assert sess["_user_id"] == str(test_user.id)
        assert "last_activity" in sess


def test_login_incorrect_password(client):
    response1 = client.post(
        "/register", json={"username": "user2", "password": "qweqwe2"}
    )
    assert response1.status_code == 200

    response_logout = client.post("/logout")
    assert response_logout.status_code == 200
    assert response_logout.json["message"] == "Logged out"

    response = client.post(
        "/login", json={"username": "user2", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert response.json["error"] == "Incorrect password"
    with client.session_transaction() as sess:
        assert "_user_id" not in sess


def test_login_nonexistent_user(client):
    response = client.post(
        "/login", json={"username": "nouser", "password": "password"}
    )
    assert response.status_code == 404
    assert response.json["error"] == "User does not exist"


def test_login_when_already_logged_in(logged_in_client, test_user):
    response = logged_in_client.post(
        "/login", json={"username": test_user.username, "password": "password"}
    )
    assert response.status_code == 400
    assert response.json["error"] == "Already logged in"


def test_logout(client, logged_in_client):
    response = logged_in_client.post("/logout")
    assert response.status_code == 200
    assert response.json["message"] == "Logged out"
    with client.session_transaction() as sess:
        assert "_user_id" not in sess


def test_logout_not_logged_in(client):
    response = client.post("/logout")
    assert response.status_code == 401
    assert response.json["error"] == "Unauthorized"


def test_me_authenticated(logged_in_client, test_user):
    response = logged_in_client.get("/me")
    assert response.status_code == 200
    assert response.json["username"] == test_user.username


def test_me_unauthenticated(client):
    response = client.get("/me")
    assert response.status_code == 401
    assert response.json["error"] == "Not logged in"


def test_session_timeout(app, client, test_user):
    app.config["PERMANENT_SESSION_LIFETIME"] = datetime.timedelta(seconds=2)

    login_resp = client.post(
        "/login", json={"username": test_user.username, "password": "password"}
    )
    assert login_resp.status_code == 200

    with client.session_transaction() as sess:
        assert "last_activity" in sess
        login_time = datetime.datetime.fromisoformat(sess["last_activity"])

        old_time = (login_time - datetime.timedelta(seconds=3)).replace(
            tzinfo=datetime.timezone.utc
        )
        sess["last_activity"] = old_time.isoformat()

    resp_after_timeout = client.get("/me")
    assert resp_after_timeout.status_code == 401

    with client.session_transaction() as sess:
        assert "_user_id" not in sess
