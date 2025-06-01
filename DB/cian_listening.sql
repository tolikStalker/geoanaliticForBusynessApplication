CREATE TABLE
    IF NOT EXISTS CIAN_LISTINGS (
        cian_id BIGINT PRIMARY KEY,
        city_id BIGINT REFERENCES city(id),
        coordinates geometry (POINT, 4326),
        price int,
        total_area REAL,
        last_updated timestamp default now ()
    );

CREATE INDEX IF NOT EXISTS idx_cian_listings_city_id ON cian_listings (city_id);
CREATE INDEX IF NOT EXISTS idx_cian_listings_price ON cian_listings (price); 
CREATE INDEX IF NOT EXISTS idx_cian_listings_city_price ON cian_listings (city_id, price);
