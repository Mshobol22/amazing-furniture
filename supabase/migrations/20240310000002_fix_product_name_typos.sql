-- Fix product name typos from supplier CSV data
UPDATE products SET name = REPLACE(name, 'Rcliner', 'Recliner') WHERE name LIKE '%Rcliner%';
UPDATE products SET name = 'Coffee Table' WHERE name = 'Coffe Table';
UPDATE products SET name = REPLACE(name, 'Dinning', 'Dining') WHERE name LIKE '%Dinning%';
UPDATE products SET name = REPLACE(name, 'Coffetable', 'Coffee Table') WHERE name LIKE '%Coffetable%';
UPDATE products SET name = REPLACE(name, 'Marblr', 'Marble') WHERE name LIKE '%Marblr%';
