import re

import psycopg2
from psycopg2.extras import execute_batch
from selenium import webdriver
from selenium.common import NoSuchElementException, TimeoutException
from selenium.webdriver import ActionChains, Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.edge.service import Service
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from sqlalchemy import create_engine, text
from geoalchemy2 import WKTElement

db_params = {
    "dbname": "diplom",
    "user": "postgres",
    "password": "chkaf042do",
    "host": "localhost",
    "port": "5432",
}


def parse_coordinates(coord_str):
    try:
        lat, lon = map(float, coord_str.split(','))
        return f'POINT({lon} {lat})'
    except Exception as exc:
        print(f'Ошибка координат: {coord_str} - {str(exc)}')
        return None


city = ['Таганрог', 'Железноводск', 'Москва']
selectedCity = city[0]
organization = ['магазин продуктов']
options = Options()
# options.headless = True

service = Service(executable_path='./msedgedriver.exe')
driver = webdriver.Edge(service=service, options=options)

driver.get('https://yandex.ru/maps/')
try:
    wait = WebDriverWait(driver, 10)  # Wait up to 10 seconds

    search_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '.suggest > span > span > input')))
    search_button = wait.until(
        EC.element_to_be_clickable((By.XPATH, "//button/span/div[contains(@class,'_type_search')]")))
    search_input.send_keys(selectedCity + ' ' + organization[0])
    search_button.click()
except NoSuchElementException:
    print('not found search elements')
    driver.quit()

try:
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, 'ul.search-list-view__list li.search-snippet-view'))
    )
except NoSuchElementException:
    print('Ошибка: search_snippet не найден')
except Exception as e:
    print("Ошибка ожидания исчезновения спиннера:", e)

while True:
    try:
        try:
            WebDriverWait(driver, 3).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".search-snippet-view__placeholder")))
        except TimeoutException:
            print('Закончились(')
            break

        last_result = driver.find_element(By.CSS_SELECTOR, ".search-snippet-view__placeholder:last-of-type")

        if last_result:
            ActionChains(driver).scroll_to_element(last_result).perform()

    except NoSuchElementException:
        print('не найден')
        break

new_results = driver.find_elements(By.CSS_SELECTOR, "li.search-snippet-view")

if new_results:
    print('найдено', len(new_results), 'организаций:')

    data_batch = []

    for snippet in new_results:
        wait = WebDriverWait(driver, 2)
        wait.until(EC.presence_of_all_elements_located((By.CLASS_NAME, 'search-snippet-view__body')))
        coords=None
        name=None
        rating=None
        rate_amount=None
        category='другое'
        address=None

        try:
            # Координаты
            coords = snippet.find_element(By.CLASS_NAME, 'search-snippet-view__body').get_attribute('data-coordinates')
        except (NoSuchElementException, TimeoutException) as e:
            coords = "N/A"
            print(f"Ошибка при получении координат: {e}")

        try:
            # Название компании
            name_element = WebDriverWait(snippet, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, 'search-business-snippet-view__title'))
            )
            name = name_element.get_attribute('innerText')
        except (NoSuchElementException, TimeoutException) as e:
            name = None
            print(f"Ошибка при получении названия: {e}")

        try:
            # Рейтинг
            rating = snippet.find_element(By.CLASS_NAME, 'business-rating-badge-view__rating-text').get_attribute(
                'innerText')
        except NoSuchElementException:
            rating = None

        try:
            # Количество оценок
            rate_amount = snippet.find_element(By.CLASS_NAME, 'business-rating-amount-view').get_attribute('innerText')
        except NoSuchElementException:
            rate_amount = None

        try:
            # Адрес
            address = snippet.find_element(By.CLASS_NAME, 'search-business-snippet-view__address').get_attribute(
                'innerText')
        except NoSuchElementException:
            address = None

        data_batch.append({
            'name': name,
            'rating': float(rating.replace(',', '.')) if rating else None,
            'reviews_count': int(re.search(r'\d+', rate_amount).group()) if rate_amount else None,
            'category': category.lower() if category else None,
            'coordinates': parse_coordinates(coords),
            'address': address if address else None,
            'city': selectedCity
        })

    if data_batch:
        query = """
                        INSERT INTO organizations 
                            ("Название", "Рейтинг", "Количество_отзывов", "Категория","Координаты","Адрес","Город")
                            SELECT %(name)s, %(rating)s, %(reviews_count)s, %(category)s, ST_GeomFromText(%(coordinates)s, 4326), %(address)s,%(city)s
                        ON CONFLICT ("Название", "Координаты") DO NOTHING
                    """
        try:
            with psycopg2.connect(**db_params) as conn, conn.cursor() as cur:
                execute_batch(cur, query, data_batch)
                conn.commit()
                print("Добавлена записей:", len(data_batch))
        except Exception as e:
            print(f"Ошибка вставки: {str(e)}")

    driver.quit()
else:
    print('no snippets')
    driver.quit()
#
# search_input = WebDriverWait(driver, 10).until(
#     EC.presence_of_element_located((By.CSS_SELECTOR, '.suggest > span > span > input'))
# )
# search_button = WebDriverWait(driver, 10).until(
#     EC.element_to_be_clickable((By.XPATH, "//button/span/div[contains(@class,'_type_search')]"))
# )
# search_input.clear()
# search_input.send_keys(organization[0])
# search_button.click()
#
# try:
#     WebDriverWait(driver, 10).until(
#         EC.invisibility_of_element_located((By.CLASS_NAME, 'small-search-form-view__spinner'))
#     )
# except Exception as e:
#     print("Ошибка ожидания исчезновения спиннера:", e)
#
