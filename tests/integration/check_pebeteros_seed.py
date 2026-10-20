"""Seed de pebeteros: aplica sobre el esquema completo, es idempotente y cuadra con el inventario."""
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[2]
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
for name in sorted((ROOT / "migrations").glob("*.sql")):
    db.executescript(name.read_text(encoding="utf-8-sig"))
db.executescript((ROOT / "seeds/initial_catalog.sql").read_text(encoding="utf-8"))
seed = (ROOT / "seeds/2026-10-20_pebeteros.sql").read_text(encoding="utf-8")
db.executescript(seed)
db.executescript(seed)  # segunda ejecución: no duplica nada

def one(sql):
    return db.execute(sql).fetchone()[0]

assert one("SELECT COUNT(*) FROM store_products WHERE id LIKE 'product-pebetero-%'") == 6
assert one("SELECT COUNT(*) FROM store_variants WHERE id LIKE 'variant-pebetero-%'") == 17
assert one("SELECT SUM(on_hand) FROM store_variants WHERE id LIKE 'variant-pebetero-%'") == 38
assert one("SELECT SUM(new_on_hand) FROM store_inventory_movements WHERE variant_id LIKE 'variant-pebetero-%'") == 38
assert one("SELECT COUNT(*) FROM store_product_categories WHERE category_id='cat-pebeteros'") == 6
# Nada se publica ni se fabrica bajo pedido: sin precio y solo existencias.
assert one("SELECT COUNT(*) FROM store_products WHERE id LIKE 'product-pebetero-%' AND status <> 'draft'") == 0
assert one("SELECT COUNT(*) FROM store_variants WHERE id LIKE 'variant-pebetero-%' AND (status <> 'inactive' OR price_cop IS NOT NULL OR allow_made_to_order <> 0)") == 0
assert one("SELECT on_hand FROM store_variants WHERE id='variant-pebetero-cilindro-verde'") == 4
assert one("SELECT on_hand FROM store_variants WHERE id='variant-pebetero-panal-lila'") == 1
print("Seed de pebeteros: 6 productos, 17 variantes, 38 unidades, idempotente: PASS")
