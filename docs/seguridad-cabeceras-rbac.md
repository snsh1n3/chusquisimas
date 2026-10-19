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

### CSP

En modo bloqueante desde el 19-oct-2026, después de una semana en Report-Only.
Se activó sin revisar los logs de esa semana: la única violación conocida era
el beacon de Cloudflare Web Analytics, que quedó permitido. Conviene revisar
`csp.violation` los primeros días. El navegador sigue reportando a `/api/csp-report`, que
registra eventos `csp.violation`.

Si algo legítimo deja de cargar (un script, una imagen o una conexión externa):
1. Buscar `event = csp.violation` en Workers Logs: `directive` y `blocked`
   indican qué se bloqueó.
2. Agregar ese origen en `BASE_CSP`, o volver a Report-Only con
   `CSP_ENFORCE = false` mientras se corrige, y desplegar.

Pendiente: sustituir `'unsafe-inline'` en `script-src` por nonces de Next.js.

### HSTS

`max-age=31536000; includeSubDomains` desde el 19-oct-2026. Se revisó el DNS:
los únicos subdominios web son `www` (redirige a `chusquisimas.com`) y `admin`,
ambos detrás de Cloudflare con HTTPS; los demás registros son de correo (MX,
SPF, DKIM, DMARC), que HSTS no afecta.

Cualquier subdominio nuevo que se abra en un navegador debe servir HTTPS
desde el primer día: los navegadores que ya visitaron el sitio no aceptarán
HTTP durante un año. Sin `preload`.

`www` es un registro `AAAA 100::` con proxy (sin servidor de origen). La
redirección la hace la regla de Cloudflare "Redirect www to apex" (Rules →
Redirect Rules): `https://www.chusquisimas.com/*` → `https://chusquisimas.com/${1}`,
301, conservando la query string. Verificado el 19-oct-2026. El proyecto Pages
anterior (`selvarea-app`) ya no recibe tráfico.

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

## Cachés

### Claves de Access (JWKS)

`access-jwt.ts` guarda las claves públicas de Access 5 minutos por instancia del
Worker. Ante un `kid` desconocido (rotación) refresca de inmediato, pero como
máximo una vez cada 30 s, para que tokens inventados no generen consultas. La
autorización (usuario activo, roles y permisos) se sigue leyendo de D1 en cada
solicitud: revocar a alguien en D1 tiene efecto inmediato.

### Fotografías públicas

Cada carga crea un id nuevo y el archivo nunca se sobrescribe, así que el id
funciona como versión.

- D1 se consulta siempre: si el producto deja de estar publicado, la foto
  responde 404 en la siguiente solicitud que llegue al Worker.
- Navegador: `max-age=300` y `ETag` por id (304 sin volver a descargar).
- Worker: Cache API por 1 día para el contenido, para no leer R2 en cada visita.
- `X-Edge-Cache: HIT | MISS | BYPASS` indica de dónde salió la imagen.

Al eliminar una fotografía se borra primero la fila de D1 (deja de servirse en
la siguiente solicitud) y luego los objetos de R2. Las copias que queden en la
Cache API de cada centro de datos no se pueden leer, porque D1 se consulta antes
de la caché, y expiran solas en un día.

### Variantes de cada fotografía

| Ruta | Archivo en R2 | Uso |
|---|---|---|
| `/api/images/<id>` | `products/<producto>/<id>.webp` (1400 px) | Página de producto |
| `/api/images/<id>/thumb` | `products/<producto>/<id>-thumb.webp` (480 px) | Tarjetas y miniaturas |
| `/api/admin/images/<id>` | miniatura (o la principal) | Panel, también para productos sin publicar; exige Access y `catalog.read` |
