import re

import psycopg2
import time
from selenium import webdriver
from selenium.common import NoSuchElementException, TimeoutException
from selenium.webdriver import ActionChains, Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.edge.service import Service
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.wait import WebDriverWait
from psycopg2.extras import execute_values
from selenium.webdriver.support import expected_conditions as EC

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
prefs={'profile.managed_default_content_settings.images':2}
options.add_experimental_option('prefs',prefs)  # load without images
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
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, '.search-snippet-view__link-overlay._focusable'))
    )
except NoSuchElementException:
    print('Ошибка: search_snippet не найден')
except Exception as e:
    print("Ошибка ожидания исчезновения спиннера:", e)

n=0
while True:
    time.sleep(1)
    elements = driver.find_elements(By.CLASS_NAME, "search-business-snippet-view__content")
    l1=len(elements)
    driver.execute_script('arguments[0].scrollIntoView(true);', elements[-1])
    elements = driver.find_elements(By.CLASS_NAME, "search-business-snippet-view__content")
    l2=len(elements)
    if l1==l2:
        n+=1
        if n>=10:
            break
    else: n=0
        
        
new_results = driver.find_elements(By.CSS_SELECTOR, "li.search-snippet-view")
driver.quit()
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

        data_batch.append((
            name,
            float(rating.replace(',', '.')) if rating else None,
            int(re.search(r'\d+', rate_amount).group()) if rate_amount else None,
            category.lower() if category else None,
            parse_coordinates(coords),
            address if address else None,
            selectedCity
        ))

    if data_batch:
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()
        
        query = """
                        INSERT INTO organizations 
                            ("Название", "Рейтинг", "Количество_отзывов", "Категория","Координаты","Адрес","Город")
                            VALUES %s
                        ON CONFLICT ("Название", "Координаты") DO NOTHING
                    """
        execute_values(cursor, query, data_batch)
    
        conn.commit()
        cursor.close()
        conn.close()
else:
    print('no snippets')
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
