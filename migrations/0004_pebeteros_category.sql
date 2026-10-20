-- Categoría «Pebeteros» (20-oct-2026). Solo agrega una fila: no reconstruye
-- tablas. (Reconstruir store_products para un tipo nuevo borraría en cascada
-- variantes y fotos, incluso con defer_foreign_keys; por eso los pebeteros usan
-- el tipo «custom» con esta categoría propia.)
INSERT OR IGNORE INTO store_categories (id, slug, name, sort_order)
  VALUES ('cat-pebeteros', 'pebeteros', 'Pebeteros', 5);
