"""RBAC single source of truth: D1 owns the role -> permission matrix.

Checks, on an isolated in-memory SQLite DB built from the migrations:
1. Every permission identifier declared in permissions.ts exists in
   admin_permissions, and vice versa (code and DB agree on valid keys).
2. The seeded role matrix matches the expected matrix, so a migration cannot
   silently widen or narrow a system role.
3. permissions.ts no longer hardcodes a role -> permission mapping.
"""
from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parents[2]
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
for name in sorted((ROOT / "migrations").glob("*.sql")):
    db.executescript(name.read_text(encoding="utf-8-sig"))

source = (ROOT / "src/lib/admin/permissions.ts").read_text(encoding="utf-8")
block = re.search(r"ADMIN_PERMISSIONS\s*=\s*\[(.*?)\]\s*as const", source, re.S)
assert block, "ADMIN_PERMISSIONS not found in permissions.ts"
code_keys = set(re.findall(r'"([a-z]+\.[a-z_]+)"', block.group(1)))
db_keys = {row[0] for row in db.execute("SELECT key FROM admin_permissions")}
assert code_keys == db_keys, f"permission keys differ: code-only={code_keys - db_keys}, db-only={db_keys - code_keys}"

assert "ROLE_PERMISSIONS" not in source, "role matrix must live only in D1 (admin_role_permissions)"

EXPECTED = {
    "administrator": {"catalog.read", "catalog.write", "inventory.write", "media.write",
                      "audit.read", "users.manage", "permissions.manage"},
    "manager": {"catalog.read", "catalog.write", "inventory.write", "media.write", "audit.read"},
    "inventory": {"catalog.read", "inventory.write", "audit.read"},
    "viewer": {"catalog.read", "audit.read"},
}
actual: dict[str, set[str]] = {}
for role, key in db.execute("SELECT role_id, permission_key FROM admin_role_permissions"):
    actual.setdefault(role, set()).add(key)
assert actual == EXPECTED, f"seeded role matrix changed: {actual}"

print("RBAC: D1 is the only role matrix, keys in sync with code: PASS")
