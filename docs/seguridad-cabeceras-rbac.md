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
