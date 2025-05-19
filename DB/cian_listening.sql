CREATE TABLE
    IF NOT EXISTS CIAN_LISTINGS (
        cian_id BIGINT PRIMARY KEY,
        city_id BIGINT REFERENCES city(id),
        coordinates geometry (POINT, 4326),
        price int,
        total_area REAL,
        last_updated timestamp default now ()
    );
