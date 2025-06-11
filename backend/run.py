from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()

def check_db_connection():
    with app.app_context():
        try:
            db.session.execute(text("SELECT 1"))
            db.session.execute(text("SELECT * from users"))

            print("Подключение к базе данных успешно.")
        except Exception as e:
            print(f"Ошибка подключения к базе данных: {str(e)}")
            exit(1)

if __name__ == "__main__":
    check_db_connection()
    app.run(debug=True)
