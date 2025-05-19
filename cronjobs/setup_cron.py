import platform
import os
import getpass
from pathlib import Path
import subprocess


def setup_linux_cron():
    cron_jobs = [
        "0 3 1 * * /usr/bin/python3 ~/scripts/organization_parse.py >> ~/logs/organization_parse.log 2>&1",
        "0 4 1 * * /usr/bin/python3 ~/scripts/cian_parse.py >> ~/logs/cian_parse.log 2>&1",
        "0 5 1 1 * /usr/bin/python3 ~/scripts/population.py >> ~/logs/population.log 2>&1"
        "0 4 1 1 * /usr/bin/python3 ~/scripts/city.py >> ~/logs/city.log 2>&1",
    ]

    print("[*] Установка задач в crontab...")
    current_cron = os.popen("crontab -l 2>/dev/null").read()
    for job in cron_jobs:
        if job not in current_cron:
            current_cron += job + "\n"
    with os.popen("crontab -", "w") as cron_file:
        cron_file.write(current_cron)
    print("[+] Задачи добавлены в crontab.")


def setup_windows_tasks():
    username = getpass.getuser()
    python_path = Path(rf"C:\Users\{username}\PycharmProjects\dipl\.venv\Scripts\python.exe")

    tasks = [
        {
            "name": "ParseOrganizations",
            "time": "03:00",
            "schedule": "monthly",
            "day": "1",
            "script": rf"C:\Users\{username}\PycharmProjects\dipl\data_collector\organization_parse.py",
            "log": rf"C:\Users\{username}\PycharmProjects\dipl\logs\organization_parse.log",
        },
        {
            "name": "ParseRentOffers",
            "time": "04:00",
            "schedule": "monthly",
            "day": "1",
            "script": rf"C:\Users\{username}\PycharmProjects\dipl\data_collector\cian_parse.py",
            "log": rf"C:\Users\{username}\PycharmProjects\dipl\logs\cian_parse.log",
        },
        {
            "name": "UpdateCity",
            "time": "04:00",
            "schedule": "yearly",
            "month": "JAN",
            "script": rf"C:\Users\{username}\PycharmProjects\dipl\data_collector\city.py",
            "log": rf"C:\Users\{username}\PycharmProjects\dipl\logs\city.log",
        },
        {
            "name": "UpdatePopulation",
            "time": "05:00",
            "schedule": "yearly",
            "month": "JAN",
            "script": rf"C:\Users\{username}\PycharmProjects\dipl\data_collector\population.py",
            "log": rf"C:\Users\{username}\PycharmProjects\dipl\logs\population.log",
        },
    ]

    print("[*] Установка задач в Windows Task Scheduler...")
    for task in tasks:
        if task["schedule"].lower() == "yearly":
            schedule = "MONTHLY"
        else:
            schedule = task["schedule"].upper()

        cmd = (
            f'schtasks /Create /TN "{task["name"]}" '
            f'/TR "{python_path} {task["script"]} >> {task["log"]} 2>&1" '
            f'/SC {schedule} '
        )

        if task["schedule"].lower() == "yearly":
            cmd += f'/M {task["month"]} /D 1 '
        else:
            cmd += f'/D {task.get("day", "1")} '

        cmd += f'/ST {task["time"]} /F'

        os.system(cmd)
    print("[+] Задачи добавлены в планировщик.")


def run_scripts_immediately():
    username = getpass.getuser()

    scripts = [
        rf"C:\Users\{username}\PycharmProjects\dipl\data_collector\city.py",
        rf"C:\Users\{username}\PycharmProjects\dipl\data_collector\cian_parse.py",
        rf"C:\Users\{username}\PycharmProjects\dipl\data_collector\organization_parse.py",
        rf"C:\Users\{username}\PycharmProjects\dipl\data_collector\population.py",
    ]

    for script in scripts:
        print(f"[*] Запуск скрипта {script}...")
        if platform.system() == "Windows":
            python_exe = Path(rf"C:\Users\{username}\PycharmProjects\dipl\.venv\Scripts\python.exe")
            subprocess.run([str(python_exe), script])
        else:
            python_exe = Path.home() / "PycharmProjects/dipl/.venv/bin/python"
            subprocess.run([python_exe, script])


system = platform.system()
if system == "Linux" or system == "Darwin":
    setup_linux_cron()
    run_scripts_immediately()

elif system == "Windows":
    setup_windows_tasks()
    run_scripts_immediately()

else:
    print(f"[!] Неподдерживаемая ОС: {system}")
