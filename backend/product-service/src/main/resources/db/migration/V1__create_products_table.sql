CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(255) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    available_stock INTEGER NOT NULL
);
