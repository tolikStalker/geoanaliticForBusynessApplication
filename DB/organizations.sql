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

CREATE INDEX IF NOT EXISTS idx_organizations_city_id ON organizations (city_id);
CREATE UNIQUE INDEX if NOT EXISTS organizations_unique_idx ON organizations (name, coordinates);
CREATE INDEX IF NOT EXISTS org_coords_3857_gist ON organizations USING GIST (ST_Transform (coordinates, 3857));

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS strength DOUBLE PRECISION GENERATED ALWAYS AS (
    COALESCE(rate, 1) * LOG(10, COALESCE(rate_count, 1) + 1)
) STORED;
