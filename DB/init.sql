-- CREATE EXTENSION IF NOT EXISTS postgis;
CREATE DATABASE diplom1
WITH
    OWNER = postgres ENCODING = 'UTF8' LOCALE_PROVIDER = 'libc' CONNECTION
LIMIT
    = -1 IS_TEMPLATE = False;

CREATE EXTENSION if not EXISTS postgis;

CREATE TABLE
    IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        "Название" VARCHAR(255),
        "Рейтинг" FLOAT,
        "Количество_отзывов" INTEGER,
        "Категория" category_enum default 'другое',
        "Координаты" geometry (POINT, 4326),
        "Город" varchar(50),
        "Адрес" varchar(255),
        last_updated timestamp default now ()
    );

truncate table organizations;

drop table organizations;

CREATE UNIQUE INDEX organizations_unique_idx ON organizations ("Название", "Координаты");

CREATE TABLE
    IF NOT EXISTS CIAN_LISTINGS (
        id SERIAL PRIMARY KEY,
        cian_id BIGINT UNIQUE,
        coordinates geometry (POINT, 4326),
        price int,
        total_area FLOAT,
        last_updated timestamp default now ()
    );
