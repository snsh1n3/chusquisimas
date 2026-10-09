"""Offline SQLite verification for safe product hard-delete prerequisites."""
import sqlite3
from pathlib import Path

root = Path(__file__).resolve().parents[2]
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
for path in ("migrations/0001_admin_access.sql", "migrations/0002_editable_catalog.sql"):
    db.executescript((root / path).read_text(encoding="utf-8"))
db.execute("INSERT INTO admin_users (id,email,status) VALUES ('test-admin','test@example.com','active')")
db.execute("INSERT INTO store_products(id,slug,name,product_type,status) VALUES ('test','test','Test','candle','archived')")
db.execute("INSERT INTO store_variants(id,product_id,sku,status,on_hand,reserved) VALUES ('var','test','CHV2-test','inactive',0,0)")
db.commit()
safe = """p.id=? AND p.name=? AND p.status='archived'
 AND NOT EXISTS (SELECT 1 FROM store_variants v WHERE v.product_id=p.id
 AND (v.on_hand<>0 OR v.reserved<>0))
 AND NOT EXISTS (SELECT 1 FROM store_product_images i WHERE i.product_id=p.id)
 AND NOT EXISTS (SELECT 1 FROM store_inventory_movements m JOIN
 store_variants v ON v.id=m.variant_id WHERE v.product_id=p.id)"""
def can_delete():
    return bool(db.execute("SELECT 1 FROM store_products p WHERE " + safe, ("test","Test")).fetchone())

assert can_delete()
db.execute("UPDATE store_variants SET on_hand=1 WHERE id='var'")
assert not can_delete()
db.execute("UPDATE store_variants SET on_hand=0 WHERE id='var'")
db.execute("""INSERT INTO store_inventory_movements
(id,variant_id,actor_user_id,old_on_hand,new_on_hand,reason)
VALUES('move','var','test-admin',0,0,'test history')""")
assert not can_delete()
db.execute("DELETE FROM store_inventory_movements")
assert can_delete()
db.execute("""INSERT INTO admin_audit_log(id,actor_user_id,action,resource_type,resource_id,details_json)
VALUES('audit','test-admin','product_delete','product','test','{"name":"Test"}')""")
db.execute("DELETE FROM store_variants WHERE product_id='test'")
db.execute("DELETE FROM store_products WHERE id='test' AND status='archived'")
db.commit()
assert db.execute("SELECT count(*) FROM admin_audit_log WHERE id='audit'").fetchone()[0] == 1
assert db.execute("PRAGMA foreign_key_check").fetchall() == []
print("Safe deletion guard and tombstone audit: PASS")
