# Puerta de publicación — Chusquisimas V2

**Estado: BLOQUEADO. No desplegar ni asociar dominios todavía.**

## Aislamiento de rutas

- `wrangler.jsonc` establece `workers_dev: false` y `preview_urls: false`.
- Sin `route` ni `routes` en la configuración: ningún hostname se asociará automáticamente por este cambio.
- CI ejecuta `tests/integration/check_deployment_gate.py` y falla si alguien altera estas condiciones.
- `chusquisimas.com`, `www` y su aplicación Pages actual están fuera del alcance.
- Cuando sea aprobado, `admin.chusquisimas.com` se asociará deliberadamente como custom domain del Worker, tras confirmar que Cloudflare Access lo protege, revisar DNS y verificar que no existan rutas alternativas.
- Los controles por hostname no sustituyen la verificación de firma JWT ni RBAC en cada endpoint.

## Impedimentos actuales de pruebas de acceso real

1. Confirmar protección Access efectiva para `admin.chusquisimas.com`, política limitada a dos correos y MFA.
2. Verificar durante la integración la validez criptográfica de tokens reales, expiración, revocación y usuarios activos en D1.
3. Probar los endpoints y el panel desde hostname público y variantes de host, incluidos accesos sin token.
4. Validar transacciones de inventario y precio contra una instancia D1 separada o entorno de prueba sin datos de negocio, incluyendo concurrencia y auditoría.
5. Verificar que ningún endpoint de medios permita escribir en R2 antes de la validación de imágenes y autenticación.
6. Asegurar recuperación, backups y procedimientos de retroceso.
7. Solicitar autorización independiente para: crear/publicar Worker, asociar `admin.chusquisimas.com`, aplicar cualquier cambio DNS y publicar storefront.

## Decisión operativa

Se permite `npm run build` y comprobaciones locales sin desplegar. No ejecutar `npm run deploy`, `wrangler deploy` ni conectar dominio hasta aprobar las condiciones anteriores.
