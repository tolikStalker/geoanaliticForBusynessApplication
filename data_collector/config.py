import json

with open("DB/config.json", "r", encoding="utf-8") as f:
    config = json.load(f)

db_params = config["db_params"]
