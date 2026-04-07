CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL,
    product_name VARCHAR(120) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    customer_name VARCHAR(120) NOT NULL,
    status VARCHAR(40) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
