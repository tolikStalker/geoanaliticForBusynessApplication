import re

import psycopg2
import time
from selenium import webdriver
from selenium.common import (
    NoSuchElementException,
    TimeoutException,
    StaleElementReferenceException,
)
from selenium.webdriver import ActionChains, Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.edge.service import Service
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.wait import WebDriverWait
from psycopg2.extras import execute_values
from selenium.webdriver.support import expected_conditions as EC
from concurrent.futures import ThreadPoolExecutor, as_completed
from config import db_params


def parse_coordinates(coord_str):
    try:
        lat, lon = map(float, coord_str.split(","))
        return f"POINT({lat} {lon})"
    except Exception as exc:
        print(f"Ошибка координат: {coord_str} - {str(exc)}")
        return None


def parse_snippet(snippet):
    try:
        try:
            address = snippet.find_element(
                By.CLASS_NAME, "search-business-snippet-view__address"
            ).text
        except NoSuchElementException:
            address = None

        # if selectedCity['name'] not in address:
        #     return

        coords = snippet.find_element(
            By.CLASS_NAME, "search-snippet-view__body"
        ).get_attribute("data-coordinates")
        try:
            name = snippet.find_element(
                By.CLASS_NAME, "search-business-snippet-view__title"
            ).text
            
        except NoSuchElementException:
            print(f"Нет названия у элемента {address or "без адреса"}, пропускаем")
            return None
        
        try:
            rating = snippet.find_element(
                By.CLASS_NAME, "business-rating-badge-view__rating-text"
            ).text
        except NoSuchElementException:
            rating = None

        try:
            rate_amount = snippet.find_element(
                By.CLASS_NAME, "business-rating-amount-view"
            ).text
        except NoSuchElementException:
            rate_amount = None

        return (
            name,
            float(rating.replace(",", ".")) if rating else None,
            int(re.search(r"\d+", rate_amount).group()) if rate_amount else None,
            # selectedCategory["id"],
            # category.lower() if category else None,
            parse_coordinates(coords),
            address,
            selectedCity["id"],
        )
    except Exception as e:
        print(f"Ошибка при парсинге элемента: {e}")
        return None


def search_and_click(text):
    for _ in range(3):
        try:
            wait = WebDriverWait(driver, 10)
            search_input = wait.until(
                EC.element_to_be_clickable((By.CLASS_NAME, "input__control"))
            )
            search_input.send_keys(Keys.CONTROL + "a")
            search_input.send_keys(Keys.DELETE)
            search_input.send_keys(text)

            search_button = wait.until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//button/span/div[contains(@class,'_type_search')]")
                )
            )
            search_button.click()
            return True
        except (
            NoSuchElementException,
            StaleElementReferenceException,
            TimeoutException,
        ):
            print(f"Не удалось выполнить поиск по запросу: {text}. Пробуем снова...")
            time.sleep(1)
    return False


conn = psycopg2.connect(**db_params)
cursor = conn.cursor()
cursor.execute("select id,name from city")
city = [{"id": city[0], "name": city[1]} for city in cursor.fetchall()]
cursor.execute("select id,name from categories where name!='другое'")
category = [{"id": city[0], "name": city[1]} for city in cursor.fetchall()]
conn.commit()
cursor.close()
conn.close()


options = Options()
prefs = {"profile.managed_default_content_settings.images": 2}
options.add_experimental_option("prefs", prefs)  # load without images
# options.headless = True

service = Service(executable_path="./data_collector/msedgedriver.exe")
driver = webdriver.Edge(service=service, options=options)

driver.get("https://yandex.ru/maps/")
for selectedCity in city:
    selectedCity=city[1]
    print(f"Поиск города {selectedCity['name']}...")
    # if not search_and_click(selectedCity["name"]):
    #     print("Ошибка поиска города.")

    for selectedCategory in category:

        time.sleep(1.5)  # пауза, чтобы поиск обновился

        print(f"Поиск организаций по категории: {selectedCategory['name']}...")
        if not search_and_click(selectedCity["name"] + " " + selectedCategory["name"]):
            print("Ошибка поиска категории.")

        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_all_elements_located(
                    (By.CLASS_NAME, "search-business-snippet-view")
                )
            )
        except NoSuchElementException:
            print("Ошибка: search_snippet не найден")
        except Exception as e:
            print("Ошибка ожидания исчезновения спиннера:", e)

        n = 0
        while True:
            time.sleep(0.05)
            elements = driver.find_elements(
                By.CLASS_NAME, "search-business-snippet-view__content"
            )
            l1 = len(elements)
            try:
                placeholder = driver.find_element(
                    By.CLASS_NAME, "search-snippet-view__placeholder"
                )
                ActionChains(driver).scroll_to_element(placeholder).perform()
            except (NoSuchElementException, StaleElementReferenceException):
                pass

            elements = driver.find_elements(
                By.CLASS_NAME, "search-business-snippet-view__content"
            )
            try:
                driver.execute_script(
                    "arguments[0].scrollIntoView(true);", elements[-1]
                )
            except StaleElementReferenceException:
                pass
            l2 = len(elements)
            if l1 == l2:
                n += 1
                if n >= 20:
                    break
            else:
                n = 0

        new_results = driver.find_elements(By.CSS_SELECTOR, "li.search-snippet-view")

        if new_results:
            print("найдено", len(new_results), "организаций")
            data_batch = []
            with ThreadPoolExecutor(max_workers=10) as executor:
                results = executor.map(parse_snippet, new_results)
                data_batch = [r for r in results if r]

            if data_batch:
                category_id = selectedCategory["id"]

                conn = psycopg2.connect(**db_params)
                cursor = conn.cursor()

                values_sql = ",".join(
                    cursor.mogrify("(%s, %s, %s, %s, %s, %s)", row).decode()
                    for row in data_batch
                )
                query = f"""
                    INSERT INTO organizations (name, rate, rate_count, coordinates, address, city_id)
                    VALUES {values_sql}
                    ON CONFLICT DO NOTHING
                    RETURNING id;
                """
                cursor.execute(query)
                conn.commit()
                inserted_orgs = [org[0] for org in cursor.fetchall()]
                if inserted_orgs:
                    print(f"Inserted organizations: {inserted_orgs}")
                else:
                    print("No organizations were inserted.")

                org_cat_pairs = [(org_id, category_id) for org_id in inserted_orgs]
                org_cat_query = """
                    INSERT INTO organization_categories (organization_id, category_id)
                    VALUES %s
                    ON CONFLICT DO NOTHING;
                """
                if org_cat_pairs:
                    execute_values(cursor, org_cat_query, org_cat_pairs)
                else:
                    print("No category pairs to insert.")
                conn.commit()
                cursor.close()
                conn.close()
                print("Вставка завершена")

        else:
            print("no snippets")

driver.quit()
