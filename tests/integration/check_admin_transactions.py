"""Exercise inventory and price audit transactions on isolated SQLite.

Mirrors the SQL used by the D1 services, with no network or Cloudflare writes.
"""
import sqlite3
from pathlib import Path

root = Path(__file__).resolve().parents[2]
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
for migration in ("0001_admin_access.sql", "0002_editable_catalog.sql"):
    db.executescript((root / "migrations" / migration).read_text(encoding="utf-8"))
db.executescript((root / "seeds/initial_catalog.sql").read_text(encoding="utf-8"))
db.executescript((root / "seeds/candle_variants.sql").read_text(encoding="utf-8"))
db.execute("INSERT INTO admin_users(id,email,status) VALUES ('test-admin','test@example.org','active')")
variant_id = "variant-titina-cafe"

def stock_adjust(expected, target, movement):
    db.execute("BEGIN")
    try:
        first = db.execute(
            """INSERT INTO store_inventory_movements
            (id,variant_id,actor_user_id,old_on_hand,new_on_hand,reason)
            SELECT ?,v.id,?,v.on_hand,?,'Conteo de prueba'
            FROM store_variants v
            WHERE v.id=? AND v.on_hand=? AND v.reserved<=?""",
            (movement,"test-admin",target,variant_id,expected,target)
        )
        second = db.execute(
            """UPDATE store_variants SET on_hand=?,updated_at=CURRENT_TIMESTAMP
            WHERE id=? AND on_hand=? AND reserved<=?
              AND EXISTS (SELECT 1 FROM store_inventory_movements
                          WHERE id=? AND variant_id=store_variants.id)""",
            (target,variant_id,expected,target,movement)
        )
        if first.rowcount != 1 or second.rowcount != 1:
            db.rollback()
            return False
        db.commit()
        return True
    except BaseException:
        db.rollback()
        raise

assert stock_adjust(0, 5, "move-1") is True
assert stock_adjust(0, 7, "move-stale") is False
assert db.execute("SELECT on_hand FROM store_variants WHERE id=?", (variant_id,)).fetchone()[0] == 5
assert db.execute("SELECT COUNT(*) FROM store_inventory_movements").fetchone()[0] == 1

def price_adjust(expected, target, audit_id):
    db.execute("BEGIN")
    try:
        first = db.execute(
            """INSERT INTO admin_audit_log
                (id,actor_user_id,action,resource_type,resource_id,details_json)
            SELECT ?,'test-admin','price_update','variant',id,
                json_object('before',price_cop,'after',?)
            FROM store_variants WHERE id=? AND price_cop IS ?""",
            (audit_id,target,variant_id,expected)
        )
        second = db.execute(
            """UPDATE store_variants SET price_cop=?,updated_at=CURRENT_TIMESTAMP
            WHERE id=? AND price_cop IS ?
              AND EXISTS (SELECT 1 FROM admin_audit_log
                          WHERE id=? AND resource_id=store_variants.id)""",
            (target,variant_id,expected,audit_id)
        )
        if first.rowcount != 1 or second.rowcount != 1:
            db.rollback()
            return False
        db.commit()
        return True
    except BaseException:
        db.rollback()
        raise

assert price_adjust(None, 25000, "price-1") is True
assert price_adjust(None, 30000, "price-stale") is False
assert db.execute("SELECT price_cop FROM store_variants WHERE id=?", (variant_id,)).fetchone()[0] == 25000
assert db.execute("SELECT COUNT(*) FROM admin_audit_log").fetchone()[0] == 1
assert db.execute("PRAGMA foreign_key_check").fetchall() == []
print("Audit integrity, stale conflict and nullable prices: PASS")
