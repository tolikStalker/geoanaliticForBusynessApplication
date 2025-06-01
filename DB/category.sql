CREATE TABLE
	IF NOT EXISTS CATEGORIES (
		id serial PRIMARY KEY,
		name VARCHAR(40) UNIQUE NOT NULL
	);

INSERT into
	CATEGORIES (name)
VALUES
	('другое'),
	('магазин продуктов'),
	('магазин овощей и фруктов'),
	('магазин мяса, колбас'),
	('молочный магазин'),
	('алкогольные напитки'),
	('фейерверки и пиротехника'),
	('торговый центр');

-- Связь многие ко многим для категорий
CREATE TABLE
	IF NOT EXISTS organization_categories (
		organization_id BIGINT REFERENCES organizations (id) ON DELETE CASCADE,
		category_id BIGINT REFERENCES categories (id) ON DELETE CASCADE,
		PRIMARY KEY (organization_id, category_id)
	);

CREATE INDEX IF NOT EXISTS idx_org_cat_category_id_org_id ON organization_categories (category_id, organization_id);
