# Política de seguridad

## Reportar una vulnerabilidad

No abras un issue público. Usa el reporte privado de GitHub:
**Security → Report a vulnerability** en este repositorio.

Incluye la URL o el archivo afectado, los pasos para reproducirlo y el impacto
que observaste.

## Alcance

- `chusquisimas.com` (tienda pública)
- `admin.chusquisimas.com` (panel protegido con Cloudflare Access)
- El código de este repositorio

Quedan fuera las pruebas de denegación de servicio, la ingeniería social y
cualquier acción que modifique datos reales de clientes o del catálogo.

## Prácticas del proyecto

- Ningún secreto se versiona: van en `wrangler secret` o en `.dev.vars` local.
- La tienda pública nunca recibe cantidades de inventario (prueba en `tests/catalog/public-boundary.test.ts`).
- El panel exige un JWT de Cloudflare Access verificado y permisos en D1 en cada solicitud.
- CSP bloqueante con reporte de violaciones; detalles en `docs/seguridad-cabeceras-rbac.md`.
- Los datos de tarjetas nunca pasarán por este sistema: ver `docs/pagos-arquitectura.md`.
