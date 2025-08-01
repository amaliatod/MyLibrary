CREATE TABLE books(
id SERIAL PRIMARY KEY,
titlu VARCHAR(255) NOT NULL,
rating DECIMAL(2,1) CHECK (rating between 0 AND 5),
descriere TEXT
);


