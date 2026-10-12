# Observabilidad de Chusquisimas V2

Los route handlers y las páginas de servidor emiten eventos JSON de una línea que
Cloudflare Workers Logs indexa automáticamente (`observability.enabled: true` en
`wrangler.jsonc`).

## Eventos

| Evento | Nivel | Cuándo |
|---|---|---|
| `api.request` | info / warn / error | Cierre de cada solicitud a `/api/*`: `operation`, `method`, `path`, `status`, `durationMs`, `outcome`, `errorCategory` |
| `api.error` | warn / error | Error capturado: `errorCategory`, `errorCode`, `errorName`, `errorMessage`, `errorCause` y, en fallos internos, `errorStack` |
| `api.origin_rejected` | warn | Mutación administrativa desde un origen distinto de `admin.chusquisimas.com` |
| `admin.*` | info | Cambios exitosos: producto creado/editado/eliminado, visibilidad, precio, inventario, variante, fotografía |
| `admin.page.denied` / `admin.page.failed` | warn / error | El panel respondió 404 por acceso denegado o por un fallo real |
| `store.catalog_unavailable` | error | La tienda no pudo leer D1 y mostró el estado de error |
| `public.image.missing_object` | warn | D1 referencia una fotografía que no existe en R2 |
| `csp.violation` | warn | El navegador reportó algo que la CSP (Report-Only) habría bloqueado: `directive`, `blocked`, `documentPath` |

Todos los eventos de una solicitud comparten `requestId` (el `cf-ray` de
Cloudflare cuando existe). Las respuestas incluyen la cabecera `X-Request-Id` y
los errores 500 de la API devuelven `requestId` en el cuerpo, para ubicar el
registro exacto.

## Categorías de error

| Categoría | Respuesta al cliente | Significado |
|---|---|---|
| `validation` | 400 con el mensaje de la aplicación | Datos de entrada inválidos |
| `conflict` | 409 con el mensaje de la aplicación | Estado desactualizado o regla de negocio |
| `auth` | 403 genérico | JWT ausente/inválido, hostname o permiso |
| `configuration` | 403 genérico | Bindings o variables de Access ausentes |
| `upstream` | 500 genérico | Access JWKS o Cloudflare Images no disponibles |
| `storage` | 500 genérico | Fallo de R2 o D1 al guardar |
| `internal` | 500 genérico | Cualquier error no previsto |

## Privacidad

Nunca se registran tokens, cabeceras, cuerpos de solicitud, query strings ni
bytes de imágenes. Los mensajes se depuran (JWT, `Bearer`, correos) y se truncan
antes de emitirse. Se registra `actorId` (UUID interno de `admin_users`), no el
correo.

## Consultas útiles (Workers & Pages → chusquisimas-v2 → Logs)

- Fallos reales: `level = error`
- Accesos denegados al panel: `errorCategory = auth`
- Solicitudes lentas: `event = api.request` y `durationMs > 1000`
- Seguir una solicitud: `requestId = <valor de X-Request-Id>`
- Revisar la CSP antes de activarla: `event = csp.violation`, agrupando por `directive` y `blocked`
