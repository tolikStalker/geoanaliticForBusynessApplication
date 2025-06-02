import json

with open("DB/config.json", "r", encoding="utf-8") as f:
    config = json.load(f)

db_params = config["db_params"]

sqlalchemy_url = (
    f"postgresql://{db_params['user']}:{db_params['password']}"
    f"@{db_params['host']}:{db_params['port']}/{db_params['dbname']}"
)
