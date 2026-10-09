"""Deployment safety gate: fail if V2 enables public default/preview URLs or changes production domains."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
config = (ROOT / "wrangler.jsonc").read_text(encoding="utf-8-sig")
config = re.sub(r"/\*.*?\*/", "", config, flags=re.S)
config = re.sub(r"(?m)^\s*//.*$", "", config)
data = json.loads(config)
assert data["name"] == "chusquisimas-v2"
assert data["workers_dev"] is False, "workers.dev must remain disabled"
assert data["preview_urls"] is False, "preview URLs must remain disabled"
assert not data.get("routes"), "Domain association needs independent approval"
assert not data.get("route"), "Worker route needs independent approval"
assert data["d1_databases"][0]["database_name"] == "chusquisimas-v2-db"
assert data["r2_buckets"][0]["bucket_name"] == "chusquisimas-v2-images"
print("V2 deployment gate: no workers.dev, no previews, no routes: PASS")
