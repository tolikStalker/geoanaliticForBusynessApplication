CREATE TABLE
    IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        city_id int REFERENCES city(id),
        name VARCHAR(255),
        rate DECIMAL(2,1),
        rate_count INT,
        coordinates geometry (POINT, 4326),
        address varchar(255),
        last_updated timestamp default now ()
    );

CREATE UNIQUE INDEX organizations_unique_idx ON organizations (name, coordinates);



CREATE OR REPLACE FUNCTION set_default_category()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO organization_categories (organization_id, category_id)
  VALUES (NEW.id, (SELECT id FROM categories WHERE name = 'другое'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_default_category
AFTER INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION set_default_category();
