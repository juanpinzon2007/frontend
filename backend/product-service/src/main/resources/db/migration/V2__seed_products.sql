INSERT INTO products (id, name, description, price, available_stock)
VALUES
    ('f0d8f8f8-c929-4660-a450-dce54b9d08b7', 'Laptop Pro 14', 'Laptop ligera para trabajo y estudio.', 1299.00, 12),
    ('2e43b830-2058-48f6-b4b5-0158f5e15a67', 'Mouse Inalambrico', 'Mouse ergonomico recargable.', 35.50, 50),
    ('709552d7-6347-4c62-8632-b0b77fa1f7ab', 'Monitor 27 4K', 'Monitor IPS de alta resolucion.', 420.00, 18)
ON CONFLICT (id) DO NOTHING;
