-- Active: 1744841426840@@127.0.0.1@5432@diplom@public
CREATE TABLE if NOT exists users (
    id serial PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    password VARCHAR(200) not null
);
