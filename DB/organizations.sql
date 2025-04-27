CREATE TABLE
    IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        city_id BIGINT REFERENCES city (id),
        name VARCHAR(255),
        rate DECIMAL(2, 1),
        rate_count INT,
        coordinates geometry (POINT, 4326),
        address varchar(255),
        last_updated timestamp default now ()
    );

CREATE UNIQUE INDEX if NOT EXISTS organizations_unique_idx ON organizations (name, coordinates);
CREATE INDEX IF NOT EXISTS org_coords_3857_gist ON organizations USING GIST (ST_Transform (coordinates, 3857));
