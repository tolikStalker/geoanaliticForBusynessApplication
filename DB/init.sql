-- CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    "Название" VARCHAR(255),
    "Рейтинг" FLOAT,
    "Количество_отзывов" INTEGER,
    "Категория" category_enum default 'другое',
    "Координаты" geometry(POINT, 4326),
    "Город" varchar(50),
    "Адрес" varchar(255)
);

truncate table organizations;

drop table organizations;

CREATE UNIQUE INDEX organizations_unique_idx
ON organizations ("Название", "Координаты");