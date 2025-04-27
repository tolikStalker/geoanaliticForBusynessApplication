CREATE Table if NOT exists analysis_requests (
	id SERIAL PRIMARY KEY,
	user_id BIGINT REFERENCES users(id),
	city_id BIGINT REFERENCES city(id),
	category_id BIGINT REFERENCES CATEGORIES(id),
	radius FLOAT NOT NULL,
	rent int NOT NULL,
	max_competitors int not NULL,
	area_count int not NULL,
	created_at timestamp default now ()
)

select * FROM analysis_requests;
