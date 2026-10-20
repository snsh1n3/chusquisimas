-- Chusquisimas V2: pedidos registrados (fase 1 de pagos, docs/pagos-arquitectura.md).
-- Aplicar en remoto solo después de exportar un respaldo de D1.
PRAGMA foreign_keys = ON;

-- Tarifas de envío editables desde el panel. NULL = "por confirmar".
CREATE TABLE IF NOT EXISTS store_shipping_zones (
  id TEXT PRIMARY KEY CHECK (id IN ('local','national')),
  label TEXT NOT NULL,
  price_cop INTEGER CHECK (price_cop IS NULL OR price_cop >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO store_shipping_zones (id, label, price_cop, sort_order) VALUES
  ('local', 'Envío local', NULL, 1),
  ('national', 'Envío nacional', NULL, 2);

-- Pedido. Los importes se copian al crearlo: el catálogo puede cambiar después.
CREATE TABLE IF NOT EXISTS store_orders (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','preparing','shipped','delivered','cancelled')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_city TEXT NOT NULL,
  shipping_zone TEXT NOT NULL REFERENCES store_shipping_zones(id) ON DELETE RESTRICT,
  shipping_label TEXT NOT NULL,
  shipping_cop INTEGER CHECK (shipping_cop IS NULL OR shipping_cop >= 0),
  subtotal_cop INTEGER NOT NULL CHECK (subtotal_cop >= 0),
  privacy_notice_version TEXT NOT NULL,
  privacy_consent_at TEXT NOT NULL,
  -- Solo mientras está "received": vencida la fecha se cancela y libera reservas.
  expires_at TEXT,
  cancel_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_store_orders_status
  ON store_orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_store_orders_expiry
  ON store_orders(expires_at) WHERE status = 'received';

CREATE TABLE IF NOT EXISTS store_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  -- SET NULL: el historial del pedido sobrevive al borrado definitivo del producto.
  variant_id TEXT REFERENCES store_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_label TEXT NOT NULL DEFAULT '',
  aroma TEXT,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  unit_price_cop INTEGER NOT NULL CHECK (unit_price_cop >= 0),
  fulfillment TEXT NOT NULL CHECK (fulfillment IN ('ready_stock','made_to_order')),
  preparation_days INTEGER,
  -- Unidades apartadas en store_variants.reserved por esta línea.
  reserved_qty INTEGER NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0 AND reserved_qty <= quantity),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_store_order_items_order
  ON store_order_items(order_id, sort_order);

-- Historial de estados. Cada transición inserta primero su evento (id único):
-- los efectos sobre inventario dependen de que ese evento exista, así una
-- transición repetida o concurrente nunca libera ni descuenta dos veces.
CREATE TABLE IF NOT EXISTS store_order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_store_order_events_order
  ON store_order_events(order_id, created_at);

INSERT OR IGNORE INTO admin_permissions(key, description) VALUES
  ('orders.read', 'Consultar pedidos y datos de contacto de clientes'),
  ('orders.write', 'Cambiar estados de pedidos y tarifas de envío');

INSERT OR IGNORE INTO admin_role_permissions(role_id, permission_key) VALUES
  ('administrator', 'orders.read'), ('administrator', 'orders.write'),
  ('manager', 'orders.read'), ('manager', 'orders.write'),
  ('inventory', 'orders.read');
