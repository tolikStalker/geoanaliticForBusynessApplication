import random
import uuid
from locust import HttpUser, TaskSet, task, between, tag

MIN_RADIUS = 0.5
MAX_RADIUS = 2.0
MIN_RENT = 0
MAX_RENT = 100000000
REALISTIC_MAX_RENT = 500000
MIN_COMPETITORS = 1
MAX_COMPETITORS = 20
MIN_AREA_COUNT = 1
MAX_AREA_COUNT = 100

available_cities = []
available_categories = []
initial_data_loaded = False


def get_random_city_id():
    if available_cities:
        return random.choice(available_cities)["id"]
    print("Warning: available_cities is empty, returning fallback city_id=1")
    return 1


def get_random_category_id():
    if available_categories:
        return random.choice(available_categories)["id"]
    print("Warning: available_categories is empty, returning fallback category_id=1")
    return 1


class UserBehavior(TaskSet):
    """Общее поведение, которое может быть как для аутентифицированных, так и для неаутентифицированных."""

    def on_start(self):
        """
        Вызывается при старте TaskSet для пользователя.
        Загружаем общие данные (города, категории) один раз для всех пользователей.
        """
        global initial_data_loaded, available_cities, available_categories
        # Этот блок выполнится только один раз, когда первый пользователь начнет этот TaskSet
        if not initial_data_loaded:
            print("UserBehavior: Attempting to load initial cities and categories...")
            # Используем self.user.client, чтобы получить доступ к HttpUser клиенту
            try:
                with self.user.client.get(
                    "/api/cities", name="/api/cities (setup)", catch_response=True
                ) as response:
                    if response.ok:
                        available_cities = response.json()
                        print(f"UserBehavior: Loaded {len(available_cities)} cities.")
                    else:
                        response.failure(
                            f"UserBehavior: Failed to load cities: {response.status_code}"
                        )

                with self.user.client.get(
                    "/api/categories",
                    name="/api/categories (setup)",
                    catch_response=True,
                ) as response:
                    if response.ok:
                        available_categories = response.json()  # API уже делает [1:]
                        print(
                            f"UserBehavior: Loaded {len(available_categories)} categories."
                        )
                    else:
                        response.failure(
                            f"UserBehavior: Failed to load categories: {response.status_code}"
                        )

                if available_cities and available_categories:
                    initial_data_loaded = True
                    print(
                        "UserBehavior: Initial data (cities, categories) loaded successfully."
                    )
                else:
                    print(
                        "UserBehavior: Failed to load essential initial data. Some tasks might rely on this data."
                    )

            except Exception as e:
                print(f"UserBehavior: Exception during initial data load: {e}")

    @task(5)
    @tag("analysis")
    def get_valid_analysis(self):
        if not self.user.is_logged_in:
            return

        if not available_cities or not available_categories:
            return

        params = {
            "city_id": get_random_city_id(),
            "category_id": get_random_category_id(),
            "radius": round(random.uniform(MIN_RADIUS, MAX_RADIUS), 2),
            "rent": random.randint(MIN_RENT, REALISTIC_MAX_RENT),
            "competitors": random.randint(MIN_COMPETITORS, MAX_COMPETITORS),
            "area_count": random.randint(MIN_AREA_COUNT, MAX_AREA_COUNT),
        }
        with self.client.get(
            "/api/analysis",
            params=params,
            name="/api/analysis (valid)",
            catch_response=True,
        ) as response:
            if response.ok:
                try:
                    data = response.json()
                    assert (
                        "locations" in data
                    ), "Missing 'locations' in valid analysis response"
                    response.success()
                except Exception as e:
                    response.failure(
                        f"Valid analysis OK but bad response: {e} - {response.text[:100]}"
                    )
            elif response.status_code == 401:
                response.failure(
                    f"get_valid_analysis UNAUTHORIZED: {response.status_code} - {params}"
                )
            elif response.status_code == 404:
                response.success()
            else:
                response.failure(
                    f"Failed valid analysis: {response.status_code} - {params} - {response.text[:100]}"
                )

    @task(2)
    @tag("analysis_validation")
    def get_analysis_validation_errors(self):
        if not self.user.is_logged_in:
            return

        base_valid_params = {
            "city_id": get_random_city_id(),
            "category_id": get_random_category_id(),
            "radius": round(random.uniform(MIN_RADIUS, MAX_RADIUS), 2),
            "rent": random.randint(MIN_RENT, REALISTIC_MAX_RENT),
            "competitors": random.randint(MIN_COMPETITORS, MAX_COMPETITORS),
            "area_count": random.randint(MIN_AREA_COUNT, MAX_AREA_COUNT),
        }
        test_cases = [
            (
                "missing_city_id",
                {k: v for k, v in base_valid_params.items() if k != "city_id"},
            ),
            (
                "missing_radius",
                {k: v for k, v in base_valid_params.items() if k != "radius"},
            ),
            ("invalid_city_id_type", {**base_valid_params, "city_id": "abc"}),
            (
                "invalid_radius_value_low",
                {**base_valid_params, "radius": MIN_RADIUS - 0.1},
            ),
            (
                "invalid_radius_value_high",
                {**base_valid_params, "radius": MAX_RADIUS + 0.1},
            ),
            ("invalid_rent_value_low", {**base_valid_params, "rent": MIN_RENT - 100}),
            ("invalid_rent_value_high", {**base_valid_params, "rent": MAX_RENT + 100}),
            (
                "invalid_competitors_low",
                {**base_valid_params, "competitors": MIN_COMPETITORS - 1},
            ),
            (
                "invalid_competitors_high",
                {**base_valid_params, "competitors": MAX_COMPETITORS + 1},
            ),
            (
                "invalid_area_count_low",
                {**base_valid_params, "area_count": MIN_AREA_COUNT - 1},
            ),
            (
                "invalid_area_count_high",
                {**base_valid_params, "area_count": MAX_AREA_COUNT + 1},
            ),
            ("non_existent_city_id", {**base_valid_params, "city_id": 999999}),
            ("non_existent_category_id", {**base_valid_params, "category_id": 999999}),
        ]
        case_name, params_to_test = random.choice(test_cases)

        with self.client.get(
            "/api/analysis",
            params=params_to_test,
            name=f"/api/analysis (invalid: {case_name})",
            catch_response=True,
        ) as response:
            if response.status_code == 400:
                try:
                    error_data = response.json()
                    assert "message" in error_data and "errors" in error_data
                    response.success()
                except Exception as e:
                    response.failure(
                        f"Validation error (400) but bad JSON: {e} - {response.text[:100]}"
                    )
            elif response.status_code == 404 and ("non_existent" in case_name):
                response.success()
            elif response.status_code == 401:
                response.failure(
                    f"get_analysis_validation_errors UNAUTHORIZED for {case_name}: {response.status_code}"
                )
            else:
                response.failure(
                    f"Unexpected response for invalid analysis ({case_name}): {response.status_code} - {response.text[:100]}"
                )

    @task(3)
    @tag("history")
    def get_history(self):
        if not self.user.is_logged_in:
            return
        with self.client.get(
            "/api/history", name="/api/history", catch_response=True
        ) as response:
            if response.ok:
                try:
                    data = response.json()
                    assert isinstance(data, list)
                    response.success()
                except Exception as e:
                    response.failure(
                        f"History OK but bad response: {e} - {response.text[:100]}"
                    )
            elif response.status_code == 401:
                response.failure(f"get_history UNAUTHORIZED: {response.status_code}")
            else:
                response.failure(
                    f"Failed to get history: {response.status_code} - {response.text[:100]}"
                )

    @task(1)
    @tag("me")
    def get_me(self):
        if not self.user.is_logged_in:
            return
        with self.client.get("/me", name="/me", catch_response=True) as response:
            if response.ok:
                try:
                    data = response.json()
                    assert "username" in data
                    response.success()
                except Exception as e:
                    response.failure(
                        f"/me OK but bad response: {e} - {response.text[:100]}"
                    )
            elif response.status_code == 401:
                response.failure(f"get_me UNAUTHORIZED: {response.status_code}")
            else:
                response.failure(
                    f"Failed to get /me: {response.status_code} - {response.text[:100]}"
                )

    @task(1)
    @tag("public_data")
    def get_public_cities(self):
        with self.client.get(
            "/api/cities", name="/api/cities (public)", catch_response=True
        ) as response:
            if response.ok:
                try:
                    cities_data = response.json()
                    assert isinstance(cities_data, list)
                    response.success()
                except Exception as e:
                    response.failure(
                        f"Cities OK but bad response: {e} - {response.text[:100]}"
                    )
            else:
                response.failure(
                    f"Failed public /api/cities: {response.status_code} - {response.text[:100]}"
                )

    @task(1)
    @tag("public_data")
    def get_public_categories(self):
        with self.client.get(
            "/api/categories", name="/api/categories (public)", catch_response=True
        ) as response:
            if response.ok:
                try:
                    categories_data = response.json()
                    assert isinstance(categories_data, list)
                    response.success()
                except Exception as e:
                    response.failure(
                        f"Categories OK but bad response: {e} - {response.text[:100]}"
                    )
            else:
                response.failure(
                    f"Failed public /api/categories: {response.status_code} - {response.text[:100]}"
                )


class AuthenticatedApiUser(HttpUser):
    host = "http://localhost:5000"

    tasks = [UserBehavior]
    wait_time = between(1, 3)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.username = f"{uuid.uuid4().hex[:8]}@testlocust.ru"
        self.password = "locustpassword1"
        self.is_logged_in = False

    def on_start(self):
        """Логин или регистрация при старте пользователя Locust."""
        print(f"User {self.username} starting...")
        with self.client.post(
            "/login",
            json={"username": self.username, "password": self.password},
            catch_response=True,
            name="/login (on_start)",
        ) as r_login:
            if r_login.ok:
                print(f"User {self.username} logged in successfully (on_start).")
                self.is_logged_in = True
                r_login.success()
            elif (
                r_login.status_code == 404
                and "user does not exist" in r_login.json().get("error", "").lower()
            ):
                print(
                    f"User {self.username} does not exist, attempting registration (on_start)."
                )
                with self.client.post(
                    "/register",
                    json={"username": self.username, "password": self.password},
                    catch_response=True,
                    name="/register (on_start)",
                ) as r_reg:
                    if r_reg.ok:
                        print(
                            f"User {self.username} registered and logged in successfully (on_start)."
                        )
                        self.is_logged_in = True
                        r_login.success()
                        r_reg.success()
                    else:
                        print(
                            f"User {self.username} registration failed (on_start): {r_reg.status_code} - {r_reg.text}"
                        )
                        self.is_logged_in = False
                        r_reg.failure(f"Registration failed: {r_reg.status_code}")
            elif r_login.status_code == 401:
                print(
                    f"User {self.username} login failed - incorrect password (on_start). Will not be logged in."
                )
                self.is_logged_in = False
                r_login.success()
            else:
                print(
                    f"User {self.username} login failed (on_start) with status {r_login.status_code}: {r_login.text}"
                )
                self.is_logged_in = False
                r_login.failure(f"Login failed: {r_login.status_code}")
        if not self.is_logged_in:
            print(
                f"WARNING: User {self.username} could not log in or register. Protected tasks will be skipped."
            )

    @task(1)
    @tag("logout")
    def logout(self):
        if self.is_logged_in:
            with self.client.post(
                "/logout", name="/logout", catch_response=True
            ) as response:
                if response.ok:
                    print(f"User {self.username} logged out.")
                    self.is_logged_in = False
                    response.success()
                    self.on_start()
                else:
                    response.failure(
                        f"Logout failed: {response.status_code} - {response.text[:100]}"
                    )
        else:
            pass
