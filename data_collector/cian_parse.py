import psycopg2
from psycopg2.extras import execute_values
from selenium import webdriver
from selenium.common import NoSuchElementException, TimeoutException
from selenium.webdriver.edge.service import Service
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from config import db_params
import time


def save_to_db(data):
    conn = psycopg2.connect(**db_params)
    cursor = conn.cursor()
    query = """

        INSERT INTO cian_listings (cian_id, city_id, coordinates, price, total_area)
        VALUES %s
        ON CONFLICT (cian_id) DO NOTHING
    """

    execute_values(cursor, query, data)
    print('вставлено!')

    conn.commit()
    cursor.close()
    conn.close()


conn = psycopg2.connect(**db_params)
cursor = conn.cursor()
cursor.execute("select osm_name,region,capital,id from city")
city = [
    {"name": city[0].lower(), "region": city[1], "capital": city[2], "id": city[3]}
    for city in cursor.fetchall()
]

options = Options()
prefs = {"profile.managed_default_content_settings.images": 2}
options.add_experimental_option("prefs", prefs)  # load without images
options.add_argument(
    "--disable-blink-features=AutomationControlled"
)  # Отключение детекции Selenium
options.add_experimental_option(
    "excludeSwitches", ["enable-automation"]
)  # Отключение автоматизации в Edge
options.add_experimental_option("useAutomationExtension", False)
service = Service(executable_path="./data_collector/msedgedriver.exe")
driver = webdriver.Edge(service=service, options=options)
for ci in city:
    if ci["name"].split("-", 1)[0] == ci["capital"]:
        url = f"https://{ci['capital']}.cian.ru/snyat-pomeshenie"
    else:
        url = f"https://{ci['capital']}.cian.ru/snyat-pomeshenie-{ci['region']}-{ci['name']}"

    driver.get(url)

    data = []

    try:
        while True:
            wait = WebDriverWait(driver, 10)  # ждем 10 сек

            cian_config_value = None
            for _ in range(10):  # Попытки в течение 10 секунд
                cian_config_value = driver.execute_script(
                    "return window._cianConfig ? window._cianConfig['legacy-commercial-serp-frontend'] : null;"
                )
                if cian_config_value:  # Если данные появились — выходим из цикла
                    break
                time.sleep(0.5)
                
            next_li=None
            try:
                active_li = wait.until(
                    EC.presence_of_element_located(
                        (By.CSS_SELECTOR, "li[class*='item--active']")
                    )
                )
                next_li = active_li.find_element(By.XPATH, "following-sibling::li[1]")
            except Exception:
                print(
                    "Не найден активный элемент списка или следующая страница отсутствует"
                )

            try:
                for offer in cian_config_value[-1]["value"]["results"]["offers"]:
                    total_area = offer.get("totalArea")
                    if total_area is None:
                        print(f"Пропущено: нет totalArea в {offer['cianId']}")
                        continue
    
                    data.append(
                        (
                            offer["cianId"],
                            ci["id"],
                            f"POINT({offer['geo']['coordinates']['lng']} {offer['geo']['coordinates']['lat']})",
                            offer["priceTotalPerMonthRur"],
                            float(total_area),
                        )
                    )
            except KeyError as e:
                print(f"Ошибка парсинга JSON: {e}")
                break

            if next_li:
                try:
                    # Найти ссылку внутри этого li
                    next_link = next_li.find_element(By.TAG_NAME, "a").get_attribute("href")
                    print(f"Переходим по ссылке: {next_link}")
                    driver.get(next_link)  # Переход на следующую страницу
                except Exception as e:
                    print(f"Не удалось перейти по следующей ссылке: {e}")
                    break
            else:
                print("Следующего элемента нет (это последняя страница)")
                break

        save_to_db(data)

    except NoSuchElementException:
        print("Не удалось найти элементы на странице")
        driver.quit()
    except TimeoutException:
        print("Истекло время ожидания для поиска элементов")
        driver.quit()

driver.quit()
