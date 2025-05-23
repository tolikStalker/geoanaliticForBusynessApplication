CREATE table
	if not EXISTS city (
		id SERIAL PRIMARY KEY,
		osm_name varchar(255) not null UNIQUE,
		name varchar(255) not null,
		region VARCHAR(255) NOT NULL,
		capital VARCHAR(255) NOT null,
		center geometry (POINT, 4326) not null,
		population int not null check (population > 0)
	);
