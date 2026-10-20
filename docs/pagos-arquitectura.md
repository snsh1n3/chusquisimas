# Pasarela de pagos — arquitectura propuesta

Estado: **Propuesto** (20-oct-2026). No hay código de pagos todavía. Este
documento fija las decisiones que la arquitectura actual ya respeta y las que
hay que tomar antes de cobrar en línea. Los requisitos legales siguen la
[matriz de cumplimiento](matriz-cumplimiento-colombia-seguridad.md): ninguna
fase de cobro se activa con controles `LEG-*` o `SEC-*` pendientes.

## Principios

1. **Los datos de tarjeta nunca tocan nuestro servidor.** Se usa el checkout
   alojado o el widget del proveedor (redirección o iframe). Así el alcance
   PCI DSS queda en el nivel mínimo (SAQ A) y no guardamos nada sensible.
2. **El precio lo calcula el servidor.** El navegador envía variante y
   cantidad; el Worker toma precio y disponibilidad de D1. Nunca se confía en
   un monto que venga del cliente.
3. **La fuente de verdad del pago es el webhook firmado**, no la página de
   retorno. La URL de retorno solo muestra el estado que ya está en D1.
4. **Idempotencia en todo.** Cada evento del proveedor se registra una sola vez
   (identificador único); reintentos y duplicados no cambian el resultado.
5. **El pedido es una máquina de estados explícita**:
   `pendiente_pago → pagado → en_preparacion → enviado → entregado`, con salidas
   `rechazado`, `expirado`, `cancelado` y `reembolsado`. Cada transición queda
   auditada, como ya se hace con precios e inventario.

## Lo que la base actual ya aporta

| Pieza existente | Uso en pagos |
|---|---|
| `PublicVariant` sin inventario | El checkout recibe precio y disponibilidad, nunca existencias |
| `on_hand` / `reserved` con `CHECK(reserved <= on_hand)` en D1 | Reserva de unidades al crear el pedido y liberación si el pago falla o expira |
| `MAX_ORDER_QUANTITY`, validación con `ValidationError` | Límites del carrito en el servidor |
| `withApiLogging`, `requestId`, errores tipados | Trazabilidad de cada intento de pago y de cada webhook |
| Auditoría en lotes D1 (`db.batch`) | Pedido, reserva y evento de pago en una sola transacción |
| CSP bloqueante con reportes | Se amplía solo con los dominios del proveedor elegido |
| Cloudflare Access + RBAC en D1 | Permisos nuevos `orders.read` y `orders.write` para el panel |

## Modelo de datos propuesto (D1)

- `orders`: id público no secuencial, estado, totales en COP (enteros), datos
  de contacto mínimos, `expires_at` para la reserva, marcas de tiempo.
- `order_items`: variante, cantidad y **copia** del nombre y el precio al
  momento de la compra (el catálogo puede cambiar después).
- `payments`: proveedor, referencia del proveedor (única), monto, moneda,
  estado.
- `payment_events`: id del evento del proveedor (`UNIQUE`), tipo, fecha y
  resultado de la verificación de firma. Es la tabla de idempotencia.

## Flujo

1. **Crear pedido** (`POST /api/orders`): valida carrito contra D1, reserva
   unidades listas para envío y crea el pedido `pendiente_pago` con su
   expiración, todo en un lote atómico. Protegido con Turnstile y límite de
   peticiones (binding de rate limiting de Workers) contra pruebas de tarjetas.
2. **Iniciar pago**: el servidor genera la referencia y, si el proveedor la
   exige, la firma de integridad con el secreto. El navegador abre el checkout
   del proveedor.
3. **Webhook** (`POST /api/payments/<proveedor>/webhook`): verifica firma,
   comprueba que monto y moneda coinciden con el pedido, registra el evento
   (idempotente), aplica la transición y responde 200 rápido. Correos y avisos
   salen en segundo plano (`waitUntil` o Cloudflare Queues).
4. **Retorno**: `/pedido/<id>` lee el estado en D1. Si el webhook aún no llegó,
   muestra "confirmando pago" y consulta de nuevo.
5. **Expiración**: un Cron Trigger libera reservas de pedidos vencidos y
   consulta al proveedor los pagos que quedaron sin respuesta.

## Seguridad específica

- Llaves en `wrangler secret`; llaves de prueba solo en un entorno de pruebas
  separado (otro Worker y otra base D1), nunca en producción.
- CSP: añadir únicamente los orígenes del proveedor en `script-src`,
  `frame-src`, `connect-src` y `form-action`.
- `Permissions-Policy` hoy declara `payment=()`. Si se usa Payment Request API
  o el widget lo necesita, se abre solo para el origen del proveedor.
- El webhook es la única ruta de escritura sin Access; se acepta solo con firma
  válida y se registra cada rechazo como `payments.webhook_rejected`.
- Conciliación: reporte diario de pagos aprobados en el proveedor frente a
  pedidos `pagado` en D1.

## Elección del proveedor (decisión pendiente)

Comparar los proveedores que operan en Colombia (por ejemplo Wompi, Bold,
Mercado Pago, ePayco, PayU) con estos criterios, verificando cada dato
directamente con el proveedor al momento de decidir:

- Medios: tarjetas, PSE, Nequi, Daviplata, botón Bancolombia, efectivo.
- Costos por transacción, retenciones y tiempo de giro.
- Checkout alojado o widget (requisito del principio 1).
- Webhooks firmados, ambiente de pruebas y API REST usable desde Workers sin
  SDK de Node.
- Requisitos de vinculación (RUT, matrícula mercantil, cuenta bancaria): ligado
  al control `LEG-01`.
- Soporte de reembolsos y reversión del pago (Ley 1480, control `LEG-06`).

## Fases sugeridas

| Fase | Alcance | Requisitos |
|---|---|---|
| 0 (actual) | Pedido por WhatsApp sin cobro en línea | — |
| 1 | Pedido registrado en D1 con número, reserva de unidades y aviso por WhatsApp | **Implementada** (ver [pedidos.md](pedidos.md)) |
| 2 | Link de pago del proveedor enviado por el negocio | Proveedor elegido, `LEG-01`, `LEG-04` a `LEG-08` |
| 3 | Checkout integrado con webhook | Fases 1 y 2, entorno de pruebas, `SEC-*` aprobados |

La fase 1 es útil por sí sola: da números de pedido, historial y control de
inventario reservado, y deja el terreno listo para cobrar.
