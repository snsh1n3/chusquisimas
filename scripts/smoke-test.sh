#!/usr/bin/env bash
# Prueba de humo del Worker real: build de OpenNext + wrangler dev local + rutas clave.
# Detecta fallos que `next build` no ve (p. ej. 1101 por incompatibilidad Next/OpenNext).
set -euo pipefail

PORT="${PORT:-8787}"
BASE="http://127.0.0.1:${PORT}"
LOG="$(mktemp)"

npx wrangler d1 migrations apply chusquisimas-v2-db --local
npx wrangler d1 execute chusquisimas-v2-db --local --file=./seeds/initial_catalog.sql
npx wrangler d1 execute chusquisimas-v2-db --local --file=./seeds/candle_variants.sql

npx opennextjs-cloudflare build

npx wrangler dev --port "$PORT" --ip 127.0.0.1 >"$LOG" 2>&1 &
DEV_PID=$!
trap 'kill "$DEV_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  curl -s -o /dev/null "$BASE/robots.txt" && break
  sleep 2
done

fail=0
check() {
  local path="$1" expected="$2" host="${3:-chusquisimas.com}"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: ${host}" "$BASE$path")
  if [[ ",$expected," == *",$code,"* ]]; then
    echo "OK   $code  ${host}${path}"
  else
    echo "FAIL $code  ${host}${path} (esperado: $expected)"
    fail=1
  fi
}

check /             200
check /tienda       200
check /robots.txt   200
check /sitemap.xml  200
check /favicon.ico  200
check /icon.svg     200
check /apple-icon.png 200
check /no-existe    404
check /carrito      200
check /privacidad   200
# Sin JWT de Access el panel debe negar (404/403/401), nunca fallar con 500.
check /admin        401,403,404 admin.chusquisimas.com
check /admin/pedidos 401,403,404 admin.chusquisimas.com

post() {
  local path="$1" expected="$2" body="$3" origin="${4:-https://chusquisimas.com}"
  local code
  code=$(curl -s -o /tmp/smoke-body.json -w '%{http_code}' -X POST -H "Host: chusquisimas.com" \
    -H "Origin: ${origin}" -H "Content-Type: application/json" --data "$body" "$BASE$path")
  if [[ ",$expected," == *",$code,"* ]]; then
    echo "OK   $code  POST ${path}"
  else
    echo "FAIL $code  POST ${path} (esperado: $expected): $(head -c 300 /tmp/smoke-body.json)"
    fail=1
  fi
}

# Cotización: variante inexistente → se informa como no disponible, sin error.
post /api/cart/quote 200 '{"items":[{"variantId":"no-existe","quantity":1}]}'
post /api/cart/quote 403 '{"items":[{"variantId":"no-existe","quantity":1}]}' "https://evil.example"
# Pedidos: desactivados mientras falten ORDERS_ENABLED, Turnstile o el aviso de privacidad (503).
post /api/orders 201,503 '{"items":[]}'

if [[ "$fail" -ne 0 ]]; then
  echo "--- registro de wrangler dev ---"
  tail -n 80 "$LOG"
  exit 1
fi
echo "Prueba de humo: PASS"
