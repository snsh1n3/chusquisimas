# Preflight del primer despliegue — Chusquisimas V2

**NO ejecutar hasta autorización expresa del propietario.** Estas instrucciones no autorizan la publicación.

## Estado conocido
- Sitio productivo: Cloudflare Pages `chusquisimas` conectado a `main`. No modificar.
- Worker V2 previsto: `chusquisimas-v2`. Todavía no creado.
- Base D1 de V2: 19 productos borrador, 6 aromas, 90 variantes inactivas sin precio ni stock; dos usuarios administradores activos.
- R2 de V2 privado, sin imágenes cargadas.
- Access: aplicación `Chusquisimas Admin`, hostname `admin.chusquisimas.com`.
- `workers_dev=false`, `preview_urls=false`, sin rutas ni custom domains en Wrangler.

## Secuencia recomendada
1. Revisar que las reglas Access permitan **solo** los dos administradores personales, que no permitan el correo compartido y que MFA esté exigido por el proveedor de identidad.
2. Sin desplegar, ejecutar CI y revisar pruebas `npm run build`, `npm run typecheck`, pruebas de JWT firmado, y transacciones SQLite.
3. Validar una copia de las migraciones en un D1 aislado, sin sobrescribir la base actual; configurar backups y procedimiento de restauración.
4. Antes de publicar un Worker, obtener aprobación explícita para crear uno sin rutas públicas, y probar las restricciones de exposición de URLs.
5. **En etapa independiente**, revisar y autorizar la asociación de `admin.chusquisimas.com` al Worker protegido por Access. Verificar resolución DNS, certificado y redirección de sesión en ventana de prueba.
6. Acceder como cada administrador; corroborar consulta de D1, roles activos, logout y pruebas de 403/404 para requests no autenticados. Comprobar que no haya rutas alternativas, ni accesos por `chusquisimas.com/admin`.
7. Probar una variante de prueba con cambios reversibles de stock y precio; comprobar auditoría y restaurar valor anterior dejando rastro de reversión. No alterar otras variantes.
8. Documentar las evidencias antes de habilitar cambios comerciales y fotografías.
9. La tienda pública de V2, publicación de productos y ventas quedan **fuera de este despliegue**.

## Restricciones críticas
- No ejecutar `npm run deploy`, `wrangler deploy`, `wrangler routes` ni modificar DNS sin aprobación independiente.
- Una compilación exitosa no prueba conectividad con D1 ni la ejecución en Cloudflare.
- Las páginas administrativas están en `/admin` del Worker y sus mutaciones en `/api/admin/*`; asociar solo el hostname de administración no cambia esos paths. Antes de entregar URL al negocio, definir redirección segura de `/` a `/admin` en ese hostname, sin modificar el homepage de la tienda pública.
- La protección de Access por hostname no exime de JWT verificado y autorización D1 en rutas privadas.
- El almacenamiento R2 **no debe aceptar cargas de fotos** hasta validar decodificación, tamaño real, procesamiento de metadatos y auditoría.
