CREATE TABLE
    IF NOT EXISTS CIAN_LISTINGS (
        cian_id BIGINT PRIMARY KEY,
        city_id INT REFERENCES city(id),
        coordinates geometry (POINT, 4326),
        price int,
        total_area FLOAT,
        last_updated timestamp default now ()
    );
