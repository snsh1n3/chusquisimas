-- Inventario inicial de pebeteros (informado por el negocio el 20-oct-2026).
-- Productos en borrador y variantes inactivas: sin precio no se publican. Los
-- precios y las fotos se cargan desde el panel. Solo se venden las unidades
-- existentes (allow_made_to_order = 0).
-- Idempotente: IDs fijos con INSERT OR IGNORE; se puede ejecutar dos veces.
-- Producción: npx wrangler d1 execute chusquisimas-v2-db --remote --file=./seeds/2026-10-20_pebeteros.sql
PRAGMA foreign_keys = ON;

-- Pebetero Cilindro
INSERT OR IGNORE INTO store_products (id, slug, name, description, status, product_type)
  VALUES ('product-pebetero-cilindro', 'pebetero-cilindro', 'Pebetero Cilindro', '', 'draft', 'custom');
INSERT OR IGNORE INTO store_product_categories (product_id, category_id) VALUES ('product-pebetero-cilindro', 'cat-pebeteros');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-cilindro-amarillo', 'product-pebetero-cilindro', 'CHV2-PEB-CILINDRO-AMARILLO', 'Amarillo', NULL, NULL, 'inactive', 2, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-cilindro-amarillo', 'variant-pebetero-cilindro-amarillo', NULL, 0, 2, 'Inventario inicial informado el 20-oct-2026');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-cilindro-verde', 'product-pebetero-cilindro', 'CHV2-PEB-CILINDRO-VERDE', 'Verde', NULL, NULL, 'inactive', 4, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-cilindro-verde', 'variant-pebetero-cilindro-verde', NULL, 0, 4, 'Inventario inicial informado el 20-oct-2026');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-cilindro-azul', 'product-pebetero-cilindro', 'CHV2-PEB-CILINDRO-AZUL', 'Azul', NULL, NULL, 'inactive', 3, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-cilindro-azul', 'variant-pebetero-cilindro-azul', NULL, 0, 3, 'Inventario inicial informado el 20-oct-2026');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-cilindro-rosado', 'product-pebetero-cilindro', 'CHV2-PEB-CILINDRO-ROSADO', 'Rosado', NULL, NULL, 'inactive', 2, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-cilindro-rosado', 'variant-pebetero-cilindro-rosado', NULL, 0, 2, 'Inventario inicial informado el 20-oct-2026');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-cilindro-crema', 'product-pebetero-cilindro', 'CHV2-PEB-CILINDRO-CREMA', 'Crema', NULL, NULL, 'inactive', 3, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-cilindro-crema', 'variant-pebetero-cilindro-crema', NULL, 0, 3, 'Inventario inicial informado el 20-oct-2026');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-cilindro-lila', 'product-pebetero-cilindro', 'CHV2-PEB-CILINDRO-LILA', 'Lila', NULL, NULL, 'inactive', 3, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-cilindro-lila', 'variant-pebetero-cilindro-lila', NULL, 0, 3, 'Inventario inicial informado el 20-oct-2026');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-cilindro-blanco', 'product-pebetero-cilindro', 'CHV2-PEB-CILINDRO-BLANCO', 'Blanco', NULL, NULL, 'inactive', 2, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-cilindro-blanco', 'variant-pebetero-cilindro-blanco', NULL, 0, 2, 'Inventario inicial informado el 20-oct-2026');

-- Pebetero Corazón
INSERT OR IGNORE INTO store_products (id, slug, name, description, status, product_type)
  VALUES ('product-pebetero-corazon', 'pebetero-corazon', 'Pebetero Corazón', '', 'draft', 'custom');
INSERT OR IGNORE INTO store_product_categories (product_id, category_id) VALUES ('product-pebetero-corazon', 'cat-pebeteros');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-corazon-crema', 'product-pebetero-corazon', 'CHV2-PEB-CORAZON-CREMA', 'Crema', NULL, NULL, 'inactive', 2, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-corazon-crema', 'variant-pebetero-corazon-crema', NULL, 0, 2, 'Inventario inicial informado el 20-oct-2026');

-- Pebetero Domo
INSERT OR IGNORE INTO store_products (id, slug, name, description, status, product_type)
  VALUES ('product-pebetero-domo', 'pebetero-domo', 'Pebetero Domo', '', 'draft', 'custom');
INSERT OR IGNORE INTO store_product_categories (product_id, category_id) VALUES ('product-pebetero-domo', 'cat-pebeteros');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-domo-crema', 'product-pebetero-domo', 'CHV2-PEB-DOMO-CREMA', 'Crema', NULL, NULL, 'inactive', 2, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-domo-crema', 'variant-pebetero-domo-crema', NULL, 0, 2, 'Inventario inicial informado el 20-oct-2026');

-- Pebetero Ponche
INSERT OR IGNORE INTO store_products (id, slug, name, description, status, product_type)
  VALUES ('product-pebetero-ponche', 'pebetero-ponche', 'Pebetero Ponche', '', 'draft', 'custom');
INSERT OR IGNORE INTO store_product_categories (product_id, category_id) VALUES ('product-pebetero-ponche', 'cat-pebeteros');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-ponche-lila', 'product-pebetero-ponche', 'CHV2-PEB-PONCHE-LILA', 'Lila', NULL, NULL, 'inactive', 2, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-ponche-lila', 'variant-pebetero-ponche-lila', NULL, 0, 2, 'Inventario inicial informado el 20-oct-2026');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-ponche-blanco', 'product-pebetero-ponche', 'CHV2-PEB-PONCHE-BLANCO', 'Blanco', NULL, NULL, 'inactive', 2, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-ponche-blanco', 'variant-pebetero-ponche-blanco', NULL, 0, 2, 'Inventario inicial informado el 20-oct-2026');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-ponche-verde', 'product-pebetero-ponche', 'CHV2-PEB-PONCHE-VERDE', 'Verde', NULL, NULL, 'inactive', 2, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-ponche-verde', 'variant-pebetero-ponche-verde', NULL, 0, 2, 'Inventario inicial informado el 20-oct-2026');

-- Pebetero Circular
INSERT OR IGNORE INTO store_products (id, slug, name, description, status, product_type)
  VALUES ('product-pebetero-circular', 'pebetero-circular', 'Pebetero Circular', '', 'draft', 'custom');
INSERT OR IGNORE INTO store_product_categories (product_id, category_id) VALUES ('product-pebetero-circular', 'cat-pebeteros');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-circular-blanco', 'product-pebetero-circular', 'CHV2-PEB-CIRCULAR-BLANCO', 'Blanco', NULL, NULL, 'inactive', 2, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-circular-blanco', 'variant-pebetero-circular-blanco', NULL, 0, 2, 'Inventario inicial informado el 20-oct-2026');

-- Pebetero Panal
INSERT OR IGNORE INTO store_products (id, slug, name, description, status, product_type)
  VALUES ('product-pebetero-panal', 'pebetero-panal', 'Pebetero Panal', '', 'draft', 'custom');
INSERT OR IGNORE INTO store_product_categories (product_id, category_id) VALUES ('product-pebetero-panal', 'cat-pebeteros');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-panal-verde', 'product-pebetero-panal', 'CHV2-PEB-PANAL-VERDE', 'Verde', NULL, NULL, 'inactive', 2, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-panal-verde', 'variant-pebetero-panal-verde', NULL, 0, 2, 'Inventario inicial informado el 20-oct-2026');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-panal-crema', 'product-pebetero-panal', 'CHV2-PEB-PANAL-CREMA', 'Crema', NULL, NULL, 'inactive', 2, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-panal-crema', 'variant-pebetero-panal-crema', NULL, 0, 2, 'Inventario inicial informado el 20-oct-2026');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-panal-blanco', 'product-pebetero-panal', 'CHV2-PEB-PANAL-BLANCO', 'Blanco', NULL, NULL, 'inactive', 2, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-panal-blanco', 'variant-pebetero-panal-blanco', NULL, 0, 2, 'Inventario inicial informado el 20-oct-2026');
INSERT OR IGNORE INTO store_variants (id, product_id, sku, label, aroma_id, price_cop, status, on_hand, reserved, allow_made_to_order, preparation_days)
  VALUES ('variant-pebetero-panal-lila', 'product-pebetero-panal', 'CHV2-PEB-PANAL-LILA', 'Lila', NULL, NULL, 'inactive', 1, 0, 0, 0);
INSERT OR IGNORE INTO store_inventory_movements (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
  VALUES ('movement-initial-variant-pebetero-panal-lila', 'variant-pebetero-panal-lila', NULL, 0, 1, 'Inventario inicial informado el 20-oct-2026');
