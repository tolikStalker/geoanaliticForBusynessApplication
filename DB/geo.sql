-- Таблица гексагонов
CREATE TABLE
    if NOT exists city_hexagons (
        id VARCHAR(16) PRIMARY KEY,
        city_id BIGINT REFERENCES city (id), -- внешний ключ на город
        -- hex_id TEXT UNIQUE,
        population INTEGER,
        -- color TEXT,
        geom GEOMETRY (POLYGON, 4326) not NULL
    );

CREATE INDEX IF NOT EXISTS idx_city_hexagons_city_id ON city_hexagons (city_id);
CREATE INDEX IF NOT EXISTS city_hexagons_3857_gist ON city_hexagons USING GIST (ST_Transform (geom, 3857));
-- функциональный индекс на центроиды
CREATE INDEX IF NOT EXISTS city_hex_centroid_3857_gist ON city_hexagons USING GIST (ST_Transform (ST_Centroid (geom), 3857));

-- Таблица границ города
CREATE TABLE
    if NOT exists city_boundaries (
        id serial PRIMARY KEY,
        city_id BIGINT REFERENCES city (id),
        geom GEOMETRY (MULTIPOLYGON, 4326) not null
    );

CREATE INDEX IF NOT EXISTS idx_city_boundaries_city_id ON city_boundaries (city_id);
