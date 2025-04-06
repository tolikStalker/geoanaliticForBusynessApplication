import psycopg2
from psycopg2.extras import execute_values
from selenium import webdriver
from selenium.common import NoSuchElementException, TimeoutException
from selenium.webdriver.edge.service import Service
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
import time

db_params = {
    "dbname": "diplom",
    "user": "postgres",
    "password": "chkaf042do",
    "host": "localhost",
    "port": "5432",
}

def save_to_db(data):
    conn = psycopg2.connect(**db_params)
    cursor = conn.cursor()
    
    query = """
        INSERT INTO cian_listings (cian_id, coordinates, price, total_area)
        VALUES %s
        ON CONFLICT (cian_id) DO NOTHING
    """
    
    execute_values(cursor, query, data)
    
    conn.commit()
    cursor.close()
    conn.close()

options = Options()
options.add_argument("--disable-blink-features=AutomationControlled")  # Отключение детекции Selenium
options.add_experimental_option("excludeSwitches", ["enable-automation"])  # Отключение автоматизации в Edge
options.add_experimental_option("useAutomationExtension", False)

service = Service(executable_path='./msedgedriver.exe')
driver = webdriver.Edge(service=service,options=options)

driver.get("https://rostov.cian.ru/snyat-pomeshenie-rostovskaya-oblast-taganrog/")
data=[]

try:
    while True:
        wait = WebDriverWait(driver, 10)  # Wait up to 10 seconds

        cian_config_value = None
        for _ in range(10):  # Попытки в течение 10 секунд
            cian_config_value = driver.execute_script(
                "return window._cianConfig ? window._cianConfig['legacy-commercial-serp-frontend'] : null;"
            )
            if cian_config_value:  # Если данные появились — выходим из цикла
                break
            time.sleep(1)  # Ждем 1 секунду перед новой проверкой
        try:
            active_li = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "li[class*='item--active']")))
            next_li = active_li.find_element(By.XPATH, "following-sibling::li[1]")
        except Exception:
            print("🔴 Не найден активный элемент списка или следующая страница отсутствует")
            break
        
        try:
            for offer in cian_config_value[-1]['value']['results']['offers']:
                data.append((
                offer['cianId'],
                f"POINT({offer['geo']['coordinates']['lng']} {offer['geo']['coordinates']['lat']})",
                offer['priceTotalPerMonthRur'],
                offer['totalArea'],
                ))
        except KeyError as e:
            print(f"❌ Ошибка парсинга JSON: {e}")
            break
            
        if next_li:
            # Найти ссылку внутри этого li
            next_link = next_li.find_element(By.TAG_NAME, "a").get_attribute("href")
            print(f"Переходим по ссылке: {next_link}")
            driver.get(next_link)  # Переход на следующую страницу
        else:
            print("Следующего элемента нет (это последняя страница)")
            break
        
    save_to_db(data)


except NoSuchElementException:
    print('Не удалось найти элементы на странице')
    driver.quit()
except TimeoutException:
    print('Истекло время ожидания для поиска элементов')
    driver.quit()

driver.quit()
