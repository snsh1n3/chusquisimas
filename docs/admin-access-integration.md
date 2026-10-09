# Integración de Cloudflare Access para Chusquisimas Admin

La aplicación de Cloudflare Access ya se creó para `admin.chusquisimas.com`, según confirmación del negocio. El dominio no tiene un despliegue de V2.

## Requisitos antes de integrar la autenticación en rutas

1. En Zero Trust > Access > Applications > Chusquisimas Admin, obtener el **Application Audience (AUD) tag**. Se puede compartir el AUD para configurar una variable; no es una clave privada.
2. Obtener el **Team domain** de Zero Trust, por ejemplo `nombre.cloudflareaccess.com`. Debe introducirse sin `https://`.
3. Mantener una política `Allow` limitada a los dos correos autorizados; activar MFA mediante el proveedor de identidad adecuado.
4. Configurar `ACCESS_TEAM_DOMAIN` y `ACCESS_AUD` como variables en el entorno correspondiente; **no codificar un AUD de ejemplo**.
5. Conectar la función `verifyAccessToken` del módulo `src/lib/admin/access-jwt.ts` con las rutas administrativas y comprobar además `admin_users.status='active'` y permisos en D1. Por ahora el verificador es una librería independiente, no una protección instalada en rutas.
6. Denegar toda solicitud sin JWT válido, sin coincidencia en D1 o con permisos insuficientes. Probar acceso de usuarios suspendidos y acceso directo a endpoints.
7. Asegurar que no haya ningún camino alternativo en el hostname público, Workers ni endpoints que omita validación.
8. Revisar TTL y revocación: la verificación de JWT no sustituye consulta de usuarios activos en D1 ni políticas de invalidación de sesiones.

## Límite de seguridad de esta etapa

Este commit no protege rutas reales, no crea usuarios y no se ha ejecutado contra Cloudflare. Antes de desplegar, completar las pruebas de JWT válidos firmados por Access, claves rotadas, errores de red y expiración; compilar y ejecutar la suite en CI.
