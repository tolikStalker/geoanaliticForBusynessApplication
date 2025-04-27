CREATE TABLE if NOT exists users (
    id serial PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    password VARCHAR(200) not null
);
