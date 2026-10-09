"""Validate D1 migration and initial catalog using an isolated in-memory SQLite DB.
No Cloudflare access, network, or production data is needed.
"""
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[2]
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")

for path in [
    ROOT / "migrations/0001_admin_access.sql",
    ROOT / "migrations/0002_editable_catalog.sql",
    ROOT / "seeds/initial_catalog.sql",
]:
    db.executescript(path.read_text(encoding="utf-8-sig"))

assert db.execute("PRAGMA foreign_key_check").fetchall() == []
assert db.execute("SELECT COUNT(*) FROM store_products").fetchone()[0] == 19
assert db.execute("SELECT COUNT(*) FROM store_products WHERE status <> 'draft'").fetchone()[0] == 0
assert db.execute("SELECT COUNT(*) FROM store_aromas").fetchone()[0] == 6
assert db.execute("SELECT COUNT(*) FROM store_variants").fetchone()[0] == 0
assert db.execute("SELECT COUNT(*) FROM store_product_images").fetchone()[0] == 0
assert db.execute("SELECT COUNT(*) FROM admin_users").fetchone()[0] == 0
assert db.execute("SELECT COUNT(*) FROM admin_roles").fetchone()[0] == 4

# Replaying seed must not create duplicates or overwrite future business edits.
db.execute("UPDATE store_products SET description = ? WHERE slug = ?",
           ("Descripción comercial editada", "titina"))
db.executescript((ROOT / "seeds/initial_catalog.sql").read_text(encoding="utf-8"))
assert db.execute("SELECT COUNT(*) FROM store_products").fetchone()[0] == 19
assert db.execute("SELECT description FROM store_products WHERE slug = 'titina'").fetchone()[0] == "Descripción comercial editada"

# DB-level integrity: no negative stock or negative prices.
db.execute("INSERT INTO store_variants (id,product_id,sku) VALUES ('test-v','product-titina','TEST-V')")
try:
    db.execute("UPDATE store_variants SET on_hand = -1 WHERE id = 'test-v'")
    raise AssertionError("Negative stock was accepted")
except sqlite3.IntegrityError:
    pass
try:
    db.execute("UPDATE store_variants SET price_cop = -1 WHERE id = 'test-v'")
    raise AssertionError("Negative price was accepted")
except sqlite3.IntegrityError:
    pass

print("SQLite schema, 19 draft products, 6 aromas, idempotence and constraints: PASS")
