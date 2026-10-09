# Integración de Cloudflare Access para Chusquisimas Admin

La aplicación de Cloudflare Access ya se creó para `admin.chusquisimas.com`, según confirmación del negocio. El dominio no tiene un despliegue de V2.

## Valores identificados en Cloudflare Zero Trust (9 oct 2026)

- Team domain: `blue-recipe-53e6.cloudflareaccess.com` (confirmado mediante captura de Settings).
- Application: `Chusquisimas Admin`, hostname `admin.chusquisimas.com`.
- Application Audience (AUD): confirmado visualmente en el panel de Access; establecer su valor exacto como `ACCESS_AUD` en el entorno correspondiente. No se requiere almacenar credenciales en Git.
- No confundir el identificador AUD de aplicación con un token JWT de sesión.

## Requisitos antes de integrar la autenticación en rutas

1. En Zero Trust > Access > Applications > Chusquisimas Admin, obtener el **Application Audience (AUD) tag**. Se puede compartir el AUD para configurar una variable; no es una clave privada.
2. Team domain confirmado: `blue-recipe-53e6.cloudflareaccess.com`. Debe introducirse sin `https://`.
3. Mantener una política `Allow` limitada a los dos correos autorizados; activar MFA mediante el proveedor de identidad adecuado.
4. Configurar `ACCESS_TEAM_DOMAIN` y `ACCESS_AUD` como variables en el entorno correspondiente; **no codificar un AUD de ejemplo**.
5. Conectar la función `verifyAccessToken` del módulo `src/lib/admin/access-jwt.ts` con las rutas administrativas y comprobar además `admin_users.status='active'` y permisos en D1. Por ahora el verificador es una librería independiente, no una protección instalada en rutas.
6. Denegar toda solicitud sin JWT válido, sin coincidencia en D1 o con permisos insuficientes. Probar acceso de usuarios suspendidos y acceso directo a endpoints.
7. Asegurar que no haya ningún camino alternativo en el hostname público, Workers ni endpoints que omita validación.
8. Revisar TTL y revocación: la verificación de JWT no sustituye consulta de usuarios activos en D1 ni políticas de invalidación de sesiones.

## Límite de seguridad de esta etapa

Este commit no protege rutas reales, no crea usuarios y no se ha ejecutado contra Cloudflare. Antes de desplegar, completar las pruebas de JWT válidos firmados por Access, claves rotadas, errores de red y expiración; compilar y ejecutar la suite en CI.
