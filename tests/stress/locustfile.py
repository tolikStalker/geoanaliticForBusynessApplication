import random
import uuid
from locust import HttpUser, TaskSet, task, between, tag

# --- Константы из вашего Flask-приложения для генерации тестовых данных ---
MIN_RADIUS = 0.5
MAX_RADIUS = 5.0
MIN_RENT = 0
MAX_RENT = 100000000  # Можно использовать меньший верхний предел для большинства тестов
REALISTIC_MAX_RENT = 500000  # Более реалистичный верхний предел для частых тестов
MIN_COMPETITORS = 1
MAX_COMPETITORS = 20
MIN_AREA_COUNT = 1
MAX_AREA_COUNT = 100

# --- Глобальные переменные для хранения полученных данных ---
# Эти переменные будут заполняться один раз (или периодически)
# чтобы не дергать эти эндпоинты каждым пользователем постоянно
available_cities = []
available_categories = []
data_loaded = False  # Флаг, чтобы загрузить данные один раз


def get_random_city_id():
    if available_cities:
        return random.choice(available_cities)["id"]
    return 1  # Fallback, если города не загружены (в идеале, тест должен остановиться)


def get_random_category_id():
    if available_categories:
        return random.choice(available_categories)["id"]
    return 1  # Fallback


class BaseBehavior(TaskSet):
    def on_start(self):
        """
        Вызывается при старте TaskSet для пользователя.
        Попытаемся загрузить города и категории, если они еще не загружены.
        Это не идеально для Locust (лучше бы это делал один "setup" пользователь),
        но для данного примера это упрощение.
        """
        global data_loaded, available_cities, available_categories
        if not data_loaded:
            # Используем self.client родительского HttpUser
            print("Attempting to load initial cities and categories...")
            try:
                with self.client.get(
                    "/api/cities", name="/api/cities (setup)", catch_response=True
                ) as response:
                    if response.ok:
                        available_cities = response.json()
                        if not available_cities:
                            print("Warning: No cities loaded from /api/cities")
                        else:
                            print(f"Loaded {len(available_cities)} cities.")
                    else:
                        print(
                            f"Failed to load cities: {response.status_code} - {response.text}"
                        )
                        response.failure(
                            f"Failed to load cities: {response.status_code}"
                        )

                with self.client.get(
                    "/api/categories",
                    name="/api/categories (setup)",
                    catch_response=True,
                ) as response:
                    if response.ok:
                        # Важно: ваш API возвращает result[1:]
                        # Если locust будет использовать оригинальный список, ID могут не совпасть.
                        # Но мы просто сохраняем то, что вернул API.
                        available_categories = response.json()  # API уже делает [1:]
                        if not available_categories:
                            print("Warning: No categories loaded from /api/categories")
                        else:
                            print(f"Loaded {len(available_categories)} categories.")

                    else:
                        print(
                            f"Failed to load categories: {response.status_code} - {response.text}"
                        )
                        response.failure(
                            f"Failed to load categories: {response.status_code}"
                        )

                if available_cities and available_categories:
                    data_loaded = True
                    print("Initial data loaded successfully.")
                else:
                    print(
                        "Failed to load essential initial data (cities/categories). Analysis tasks might fail."
                    )

            except Exception as e:
                print(f"Exception during initial data load: {e}")
                # Можно пометить тест как неудачный, если критичные данные не загружены
                # self.user.environment.runner.quit()


class AuthenticatedUserBehavior(BaseBehavior):
    """
    Поведение для аутентифицированного пользователя.
    Предполагается, что пользователь уже вошел в систему в on_start родительского User.
    """

    @task(5)  # Более частая задача
    def get_valid_analysis(self):
        if not available_cities or not available_categories:
            print("Skipping get_valid_analysis: cities or categories not loaded.")
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
                    assert "locations" in data
                    assert "competitors" in data
                    response.success()
                except (
                    AssertionError,
                    ValueError,
                ):  # ValueError for json.JSONDecodeError
                    response.failure(
                        f"Invalid JSON response or missing keys for valid analysis: {response.text[:200]}"
                    )
            elif response.status_code == 404:  # Город или категория не найдены
                response.success()  # Ожидаемый негативный сценарий, если ID не существует
            else:
                response.failure(
                    f"Failed valid analysis: {response.status_code} - {params} - {response.text[:200]}"
                )

    @task(2)
    @tag("analysis_validation_errors")
    def get_analysis_validation_errors(self):
        """Тестирует различные ошибки валидации для /api/analysis."""
        if not available_cities or not available_categories:
            print(
                "Skipping get_analysis_validation_errors: cities or categories not loaded."
            )
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
            (
                "non_existent_city_id",
                {**base_valid_params, "city_id": 999999},
            ),  # Предполагаем, что такого ID нет
            ("non_existent_category_id", {**base_valid_params, "category_id": 999999}),
        ]

        case_name, params_to_test = random.choice(test_cases)

        with self.client.get(
            "/api/analysis",
            params=params_to_test,
            name=f"/api/analysis (invalid: {case_name})",
            catch_response=True,
        ) as response:
            if response.status_code == 400:  # Ожидаемая ошибка валидации
                try:
                    error_data = response.json()
                    assert "message" in error_data
                    assert "errors" in error_data
                    response.success()
                except (AssertionError, ValueError):
                    response.failure(
                        f"Validation error (400) but bad JSON response: {response.text[:200]}"
                    )
            elif response.status_code == 404 and (
                "non_existent" in case_name
            ):  # Ожидаемый Not Found
                response.success()
            else:
                response.failure(
                    f"Unexpected response for invalid analysis ({case_name}): {response.status_code} - {response.text[:200]}"
                )

    @task(3)
    def get_history(self):
        with self.client.get(
            "/api/history", name="/api/history", catch_response=True
        ) as response:
            if response.ok:
                try:
                    data = response.json()
                    assert isinstance(data, list)  # История должна быть списком
                    response.success()
                except (AssertionError, ValueError):
                    response.failure(
                        f"Invalid JSON response for history: {response.text[:200]}"
                    )
            else:
                response.failure(
                    f"Failed to get history: {response.status_code} - {response.text[:200]}"
                )

    @task(1)
    def get_me(self):
        with self.client.get("/me", name="/me", catch_response=True) as response:
            if response.ok:
                try:
                    data = response.json()
                    assert "username" in data
                    response.success()
                except (AssertionError, ValueError):
                    response.failure(
                        f"Invalid JSON response for /me: {response.text[:200]}"
                    )
            else:
                response.failure(
                    f"Failed to get /me: {response.status_code} - {response.text[:200]}"
                )


class UnauthenticatedUserBehavior(BaseBehavior):
    """Поведение для неаутентифицированного пользователя или для процесса входа/регистрации."""

    @task(1)
    def get_cities_task(
        self,
    ):  # Переименовано, чтобы не конфликтовать с глобальной переменной
        # Этот эндпоинт также вызывается в on_start, но может быть вызван и отдельно
        with self.client.get(
            "/api/cities", name="/api/cities", catch_response=True
        ) as response:
            if response.ok:
                try:
                    cities_data = response.json()
                    assert isinstance(cities_data, list)
                    if (
                        cities_data
                    ):  # Проверяем, что список не пустой, если ожидаются города
                        assert "id" in cities_data[0]
                        assert "name" in cities_data[0]
                    response.success()
                except (AssertionError, ValueError, IndexError):
                    response.failure(
                        f"Invalid JSON response for cities: {response.text[:200]}"
                    )
            else:
                response.failure(
                    f"Failed to get cities: {response.status_code} - {response.text[:200]}"
                )

    @task(1)
    def get_categories_task(self):
        with self.client.get(
            "/api/categories", name="/api/categories", catch_response=True
        ) as response:
            if response.ok:
                try:
                    categories_data = response.json()
                    assert isinstance(categories_data, list)
                    # Ваш API возвращает result[1:], так что список может быть пустым, если в БД всего 1 категория
                    if categories_data:
                        assert "id" in categories_data[0]
                        assert "name" in categories_data[0]
                    response.success()
                except (AssertionError, ValueError, IndexError):
                    response.failure(
                        f"Invalid JSON for categories: {response.text[:200]}"
                    )
            else:
                response.failure(
                    f"Failed to get categories: {response.status_code} - {response.text[:200]}"
                )

    @task(1)
    @tag("auth_protected_routes")
    def attempt_protected_routes(self):
        """Попытка доступа к защищенным эндпоинтам без аутентификации."""
        endpoints_to_try = ["/api/analysis", "/api/history", "/me"]
        chosen_endpoint = random.choice(endpoints_to_try)
        if chosen_endpoint == "/api/analysis":  # требует параметров
            params = {
                "city_id": 1,
                "category_id": 1,
                "radius": 1,
                "rent": 1000,
                "competitors": 5,
                "area_count": 10,
            }
            with self.client.get(
                chosen_endpoint,
                params=params,
                name=f"{chosen_endpoint} (unauth)",
                catch_response=True,
            ) as response:
                if response.status_code == 401:
                    response.success()
                else:
                    response.failure(
                        f"Protected route {chosen_endpoint} accessible unauth or wrong error: {response.status_code}"
                    )
        else:
            with self.client.get(
                chosen_endpoint, name=f"{chosen_endpoint} (unauth)", catch_response=True
            ) as response:
                if response.status_code == 401:
                    response.success()
                else:
                    response.failure(
                        f"Protected route {chosen_endpoint} accessible unauth or wrong error: {response.status_code}"
                    )

        # Попытка POST /logout без аутентификации
        with self.client.post(
            "/logout", name="/logout (unauth)", catch_response=True
        ) as response:
            if response.status_code == 401:
                response.success()
            else:
                response.failure(
                    f"POST /logout accessible unauth or wrong error: {response.status_code}"
                )


class FullUserJourney(HttpUser):
    """
    Моделирует полный жизненный цикл пользователя:
    1. Регистрация (редко) ИЛИ Вход (чаще)
    2. Использование API как аутентифицированный пользователь
    3. Выход из системы
    """

    tasks = {
        AuthenticatedUserBehavior: 10,
        UnauthenticatedUserBehavior: 1,
    }  # Аутентифицированные действия чаще
    wait_time = between(1, 5)  # Время ожидания между задачами от 1 до 5 секунд

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.username = f"testuser_{uuid.uuid4().hex[:10]}"
        self.password = "testpassword123"
        self.is_logged_in = False

    def on_start(self):
        """Вызывается один раз для каждого виртуального пользователя."""
        # Решаем, будет ли пользователь регистрироваться или пытаться войти
        # В реальном сценарии у вас могут быть предустановленные пользователи
        if random.random() < 0.8:  # 80% шанс попробовать войти, 20% зарегистрироваться
            self.login()
            if (
                not self.is_logged_in and random.random() < 0.5
            ):  # Если логин не удался, с 50% шансом пробуем зарегистрироваться
                self.register_and_login()
        else:
            self.register_and_login()

        # Вызов on_start для TaskSet'ов, чтобы загрузить начальные данные, если необходимо
        # Этот вызов on_start для TaskSet'ов выполнится после on_start самого User'а.
        # Это значит, что client уже будет настроен (с куками после логина).
        # Но наш BaseBehavior.on_start не зависит от состояния логина для загрузки городов/категорий.
        for taskset_class in self.tasks:
            if hasattr(taskset_class, "on_start") and callable(
                getattr(taskset_class, "on_start")
            ):
                # Создаем экземпляр TaskSet, чтобы вызвать его on_start
                # Это немного хак, т.к. Locust сам управляет созданием TaskSet'ов
                # Но нам нужно вызвать логику загрузки данных.
                # ВАЖНО: такой экземпляр TaskSet не будет выполнять свои @task.
                # Это делается для вызова логики on_start в BaseBehavior.
                # Это не идеальный способ управления общей начальной загрузкой данных.
                # Лучше было бы иметь слушателя событий Locust test_start/test_stop.
                # Однако, для данного случая, вызов через BaseBehavior.on_start при первом запуске TaskSet
                # для любого пользователя должен сработать для глобальных переменных.
                pass  # Логика загрузки данных в BaseBehavior.on_start вызовется, когда Locust начнет выполнять задачи из TaskSet

    def register_and_login(self):
        # Регистрация
        with self.client.post(
            "/register",
            json={"username": self.username, "password": self.password},
            name="/register",
            catch_response=True,
        ) as reg_response:
            if reg_response.ok:
                print(f"User {self.username} registered successfully.")
                reg_response.success()
                self.is_logged_in = (
                    True  # Flask-login обычно логинит сразу после регистрации
                )
            elif (
                reg_response.status_code == 400
                and "User already exists" in reg_response.text
            ):
                # Пользователь уже существует, это нормально, пытаемся войти
                print(f"User {self.username} already exists, attempting login.")
                reg_response.success()  # Считаем это успехом для регистрации, т.к. цель - получить пользователя
                self.login()
            else:
                print(
                    f"Failed to register {self.username}: {reg_response.status_code} - {reg_response.text}"
                )
                reg_response.failure(
                    f"Registration failed: {reg_response.status_code} - {reg_response.text[:100]}"
                )
                self.is_logged_in = False

    def login(self):
        with self.client.post(
            "/login",
            json={"username": self.username, "password": self.password},
            name="/login",
            catch_response=True,
        ) as login_response:
            if login_response.ok:
                print(f"User {self.username} logged in successfully.")
                login_response.success()
                self.is_logged_in = True
            elif login_response.status_code == 401:  # Invalid credentials
                print(f"Login failed for {self.username}: Invalid credentials.")
                login_response.success()  # Это ожидаемое поведение для теста на неверные данные
                self.is_logged_in = False
            elif (
                login_response.status_code == 400
                and "Already logged in" in login_response.text
            ):
                print(
                    f"User {self.username} was already logged in."
                )  # Может случиться, если сессия не очистилась
                login_response.success()
                self.is_logged_in = True
            else:
                print(
                    f"Login failed for {self.username}: {login_response.status_code} - {login_response.text}"
                )
                login_response.failure(
                    f"Login failed: {login_response.status_code} - {login_response.text[:100]}"
                )
                self.is_logged_in = False

    @task(1)  # Выход из системы - менее частая задача
    def logout_task(self):
        if self.is_logged_in:
            with self.client.post(
                "/logout", name="/logout", catch_response=True
            ) as logout_response:
                if logout_response.ok:
                    logout_response.success()
                    self.is_logged_in = False
                    print(f"User {self.username} logged out.")
                    # После выхода, можно снова попытаться войти или зарегистрироваться в следующем цикле
                    # или просто стать "неактивным" до следующего on_start (если бы он вызывался чаще)
                    # Для простоты, следующий on_start (если тест длится долго) снова попытается войти/зарегистрироваться
                    if random.random() < 0.7:  # 70% шанс снова войти
                        self.login()
                    else:  # 30% шанс зарегистрировать нового (маловероятно, что имя будет свободно без смены)
                        self.username = f"testuser_{uuid.uuid4().hex[:10]}"  # меняем имя, чтобы регистрация прошла
                        self.register_and_login()

                else:
                    logout_response.failure(
                        f"Logout failed: {logout_response.status_code} - {logout_response.text[:100]}"
                    )
        else:
            # Если не залогинен, можно попробовать залогиниться
            if random.random() < 0.5:
                self.login()


# Если вы хотите иметь отдельный тип пользователя, который только читает публичные данные:
# class PublicDataReader(HttpUser):
#     tasks = [UnauthenticatedUserBehavior]
#     wait_time = between(2, 6)
#     # В on_start этого пользователя также можно загрузить города/категории,
#     # если это первый пользователь такого типа.
