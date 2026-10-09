-- D1 schema for editable catalog. Run only after reviewing the target D1 database.
-- Products remain drafts until the administration panel activates them.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS store_categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS store_aromas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TABLE IF NOT EXISTS store_products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','archived')),
  product_type TEXT NOT NULL CHECK (product_type IN ('candle','wax_melt','kit','custom')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_product_categories (
  product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES store_categories(id) ON DELETE RESTRICT,
  PRIMARY KEY (product_id,category_id)
);

CREATE TABLE IF NOT EXISTS store_product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  alt_text TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  aroma_id TEXT REFERENCES store_aromas(id) ON DELETE RESTRICT,
  -- Null = pending price; never silently render as $0.
  price_cop INTEGER CHECK(price_cop IS NULL OR price_cop >= 0),
  status TEXT NOT NULL DEFAULT 'inactive'
    CHECK(status IN ('active','inactive')),
  on_hand INTEGER NOT NULL DEFAULT 0 CHECK(on_hand >= 0),
  reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved >= 0),
  allow_made_to_order INTEGER NOT NULL DEFAULT 1 CHECK(allow_made_to_order IN (0,1)),
  preparation_days INTEGER NOT NULL DEFAULT 14 CHECK(preparation_days >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(reserved <= on_hand)
);

CREATE INDEX IF NOT EXISTS idx_store_products_status
  ON store_products(status, product_type);
CREATE INDEX IF NOT EXISTS idx_store_variants_product
  ON store_variants(product_id, status);
CREATE INDEX IF NOT EXISTS idx_store_images_product
  ON store_product_images(product_id, sort_order);

-- Every inventory change must be written by an authenticated server action
-- and accompanied by a store_inventory_movements record, atomically.
CREATE TABLE IF NOT EXISTS store_inventory_movements (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES store_variants(id) ON DELETE RESTRICT,
  actor_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  old_on_hand INTEGER NOT NULL CHECK(old_on_hand >= 0),
  new_on_hand INTEGER NOT NULL CHECK(new_on_hand >= 0),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_store_inventory_movements_variant
  ON store_inventory_movements(variant_id,created_at);
