# Cabeceras de seguridad y RBAC

## Cabeceras HTTP

Definidas en `src/lib/security/headers.ts` y aplicadas por `next.config.ts` a
todas las respuestas de Next.js. Los estáticos servidos por ASSETS reciben las
básicas desde `public/_headers`.

| Cabecera | Tienda | Panel (`admin.chusquisimas.com`) |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000` | igual |
| `X-Content-Type-Options` | `nosniff` | igual |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | igual |
| `Permissions-Policy` | cámara, micrófono, ubicación, pagos y USB deshabilitados | igual |
| `Cross-Origin-Opener-Policy` | `same-origin` | igual |
| `X-Frame-Options` | `SAMEORIGIN` | `DENY` |
| CSP `frame-ancestors` | `'self'` | `'none'` |
| `X-Robots-Tag` | — | `noindex, nofollow` |

### CSP en modo Report-Only

La política se envía como `Content-Security-Policy-Report-Only`: el navegador no
bloquea nada y reporta a `/api/csp-report`, que registra eventos `csp.violation`.

Para activarla:
1. Dejar correr al menos una semana con tráfico real.
2. Revisar `event = csp.violation` en Workers Logs. Cada origen legítimo
   (por ejemplo Cloudflare Web Analytics) se agrega en `BASE_CSP`.
3. Cambiar `CSP_ENFORCE` a `true` y actualizar el test que lo fija en `false`.

Pendiente: sustituir `'unsafe-inline'` en `script-src` por nonces de Next.js.

### HSTS

Sin `includeSubDomains` ni `preload` hasta confirmar que ningún subdominio de
`chusquisimas.com` se sirve por HTTP: el navegador recuerda HSTS durante todo
el `max-age` y no se puede revertir del lado del servidor.

## RBAC: D1 como fuente única

- `admin_role_permissions` define qué concede cada rol.
- `admin_user_permission_overrides` concede (`allowed=1`) o retira (`allowed=0`)
  permisos individuales; retirar siempre gana.
- `src/lib/admin/permissions.ts` solo declara los identificadores válidos.
  Claves desconocidas en D1 se ignoran y nunca amplían privilegios.
- `tests/integration/check_rbac_seed.py` falla si el código vuelve a declarar
  una matriz de roles o si las claves del código y de D1 dejan de coincidir.

Cambiar permisos de un rol ya no requiere desplegar código: basta con
modificar `admin_role_permissions` en D1. El efecto es inmediato en la
siguiente solicitud.

Las fotografías usan `media.write` (Administrador y Gestor) en lugar de
`catalog.write`.
