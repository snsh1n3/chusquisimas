# Pedidos registrados (fase 1 de pagos)

Estado: **Implementado** (PR #9). Activado en configuración el 20-oct-2026
(clave de Turnstile y aviso de privacidad completos); entra en producción con
el despliegue posterior a la migración y la clave secreta.

## Qué hace

- **Carrito:** vive en el navegador y guarda solo variante y cantidad. `/carrito`
  pide al servidor nombres, precios, disponibilidad y tarifas de envío.
- **Registro (`POST /api/orders`):** valida origen, límite por IP (5 por minuto),
  datos, autorización de datos y Turnstile. Recalcula todo desde D1 y crea el
  pedido con su número (`CH-XXXXXX`).
- **Reserva:** las líneas de entrega inmediata apartan unidades
  (`store_variants.reserved`) en la misma transacción. Si no alcanzan, la línea
  pasa a bajo pedido; si el producto no se fabrica, se rechaza.
- **Ubicación y envío:** país (solo Colombia), departamento y municipio salen
  de listas (`src/data/colombia/municipalities.ts`, 1.104 municipios). Bogotá D.C.
  es envío local y el resto, nacional. El servidor decide la zona según el
  municipio y no acepta la que mande el navegador. En el pedido se guarda
  «Municipio, Departamento».
- **WhatsApp:** la confirmación abre WhatsApp con el número, las líneas, el envío
  y el total. La dirección y el pago se acuerdan ahí.
- **Panel (`/admin/pedidos`):** lista con filtros, detalle, cambios de estado y
  tarifas de envío.

## Estados

| Estado | Efecto en inventario | Siguiente |
|---|---|---|
| Recibido | Aparta unidades 48 h | En preparación, Cancelado |
| En preparación | Mantiene la reserva | Enviado, Cancelado |
| Enviado | Descuenta existencias y reservas (movimiento auditado) | Entregado |
| Entregado | — | — |
| Cancelado | Libera las reservas | — |

Los pedidos en «Recibido» con más de 48 h se cancelan solos. Se revisa al
registrar un pedido y al abrir el panel; no hay tarea programada.

## Permisos

- `orders.read`: Administrador, Gestor e Inventario. Incluye los datos de contacto.
- `orders.write`: Administrador y Gestor. Permite cambiar estados y tarifas.

## Activación (una sola vez)

Hazla en este orden. Si un paso falla, detente: la tienda sigue funcionando
con pedidos por WhatsApp.

1. **Respaldo de D1:**
   `npx wrangler d1 export chusquisimas-v2-db --remote --output=respaldo-antes-0003.sql`
2. **Migración:**
   `npx wrangler d1 migrations apply chusquisimas-v2-db --remote`
3. **Desplegar** el código con `ORDERS_ENABLED="false"`. Comprueba que la tienda y
   el panel funcionan y que aparece «Pedidos» en el panel.
4. **Turnstile:** en Cloudflare → Turnstile → Add widget:
   - Nombre: `Chusquisimas pedidos`
   - Hostnames: `chusquisimas.com`
   - Modo: Managed

   La **clave del sitio** es pública: va en `TURNSTILE_SITE_KEY` en `wrangler.jsonc`.
   La **clave secreta** se guarda con:
   `npx wrangler secret put TURNSTILE_SECRET_KEY`
5. **Aviso de privacidad:** completar `PRIVACY_RESPONSIBLE` en
   `src/lib/legal/privacy-notice.ts` (nombre del responsable, ciudad y correo)
   y revisar el texto en `/privacidad`.
6. **Tarifas de envío:** en `/admin/pedidos`, poner nombre y valor del envío local
   y del nacional. Vacío significa «por confirmar».
7. **Activar:** `ORDERS_ENABLED` en `"true"`, desplegar y hacer un pedido de prueba
   real. Luego cancélalo desde el panel y confirma que la reserva se libera.

Desactivar es inmediato: `ORDERS_ENABLED` en `"false"` y desplegar. Los pedidos
registrados se conservan.

## Desarrollo local

Copia `.dev.vars.example` como `.dev.vars`. Usa las claves de prueba de
Turnstile, que siempre aprueban.

Para ver el carrito en local también hay que completar el aviso de privacidad,
porque sin él los pedidos quedan desactivados.

## Preparado para la fase 2

El pedido guarda subtotal, envío y estado. La pasarela solo agrega las tablas
`payments` y `payment_events`, el webhook firmado y el estado «pagado» entre
«Recibido» y «En preparación» (ver [pagos-arquitectura.md](pagos-arquitectura.md)).
