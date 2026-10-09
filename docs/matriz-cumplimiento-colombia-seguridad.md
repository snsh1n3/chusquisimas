# Matriz de cumplimiento y seguridad — Chusquisimas V2

Actualizado: 2026-10-09 · Alcance: tienda pública, administración, WhatsApp y servicios Cloudflare.
**Estado general: NO APROBADO PARA OPERACIÓN COMERCIAL.**
Este documento es un control de proyecto, no un dictamen legal, certificación OWASP ni auditoría independiente.

## Estados
- `Pendiente`: sin evidencia suficiente de validación.
- `Implementado sin verificar`: hay código o recurso, falta prueba.
- `Aprobado`: evidencia vinculada, fecha y persona que autorizó.
- `No aplica`: justificación documentada, revisada y aprobada.

## Matriz (ningún control se presume aprobado)

| ID | Ámbito | Requisito / resultado verificable | Evidencia necesaria para aprobar | Estado | Bloquea ventas |
|---|---|---|---|---|---|
| LEG-01 | Formalización | Identificar persona natural o jurídica responsable, validar RUT, matrícula mercantil cuando aplique, régimen tributario y facturación con profesional competente. | Identidad comercial validada, comprobantes y revisión contable, sin guardar datos sensibles en GitHub. | Pendiente | Sí |
| LEG-02 | Identidad | Mostrar identificación del vendedor, medios de contacto y demás información exigible al proveedor. | Captura de páginas públicas y revisión jurídica. | Pendiente | Sí |
| LEG-03 | Información producto | Características, dimensiones, materiales, instrucciones, advertencias pertinentes y descripción veraz de cada referencia. | Revisión de fichas reales. | Pendiente | Sí |
| LEG-04 | Precio | Mostrar precio total en COP, tributos aplicables, costos adicionales y envío antes del consentimiento de compra. No mostrar cero por precio pendiente. | Casos de prueba y pantallas reales. | Pendiente | Sí |
| LEG-05 | Entrega | Diferenciar 14 días de preparación de tránsito de mensajería; prometer plazos verificables e informar condiciones. | Página política de entregas, flujo WhatsApp, pruebas. | Pendiente | Sí |
| LEG-06 | Consumidor | Publicar y operar políticas de garantías, retracto, reversión de pagos y devoluciones cuando correspondan; no asumir exención automática por artesanía. | Política revisada jurídicamente y proceso interno. | Pendiente | Sí |
| LEG-07 | PQR | Proveer canal identificable para peticiones, quejas y reclamos, seguimiento y enlace a SIC según norma aplicable. | Pantallas, prueba de radicación y seguimiento. | Pendiente | Sí |
| LEG-08 | Privacidad | Responsable, finalidades, autorización cuando sea exigida, derechos ARCO, canal para consultas/reclamos, conservación y transferencias/transmisiones. | Política publicada, consentimiento registrable, gestión de solicitudes y revisión. | Pendiente | Sí |
| LEG-09 | Marketing | Consentimiento independiente para publicidad y mecanismo de retiro; no reutilizar números de pedidos para spam. | Prueba opt-in / opt-out y política. | Pendiente | Sí si hay marketing |
| LEG-10 | Cookies | Inventariar cookies/analítica y aplicar transparencia y mecanismos de elección cuando corresponda. | Inventario técnico y aviso conforme a tratamiento. | Pendiente | Sí si se usan |
| LEG-11 | WhatsApp | Distinguir solicitud de cotización, aceptación y pedido confirmado; conservar evidencia de información de términos y confirmación. | Pruebas extremo a extremo, proceso comercial. | Pendiente | Sí |
| SEC-01 | Separación | Tienda pública y admin aislados; Access protege hostname administrativo y todas las APIs de escritura. | Pruebas de acceso no autorizado y revisión de rutas y DNS. | Pendiente | Sí |
| SEC-02 | Identidad | Validación criptográfica de JWT Cloudflare Access (issuer, audience, expiración, firma), no confiar en cabeceras no verificadas. | Tests válidos/inválidos, revisión del código. | Pendiente | Sí |
| SEC-03 | Permisos | Usuario activo en D1, RBAC servidor con denegación predeterminada, pruebas IDOR, último admin protegido. | Suite de autorización + prueba de escalamiento. | Implementado sin verificar (modelo básico) | Sí |
| SEC-04 | Sesiones | MFA para admins, sesión razonable, cookies Secure/HttpOnly/SameSite y defensa CSRF. | Pruebas autenticación y cookies. | Pendiente | Sí |
| SEC-05 | D1 | SQL parametrizado, invariantes y transacciones atómicas para stock/precios, auditoría inmutable y control de concurrencia. | Pruebas de contención y rollback. | Pendiente | Sí |
| SEC-06 | R2 | Bucket privado, carga autenticada, límites por tamaño, validación real del archivo, formatos permitidos y nombre aleatorio. | Tests de subida maliciosa y lectura restringida. | Pendiente | Sí |
| SEC-07 | Seguridad web | TLS, CSP validada en producción, HSTS con evaluación previa, headers, CORS mínimo, control de abuso y errores seguros. | Evidencia de encabezados y pruebas. | Pendiente | Sí |
| SEC-08 | Desarrollo | Dependencias auditadas, lockfile, secreto fuera de Git, CI con lint/types/test/build, revisión de PR y ramas protegidas. | Ejecución CI reproducible. | Pendiente | Sí |
| SEC-09 | Continuidad | Backups D1, recuperación R2, monitoreo, alertas, revocación y procedimiento de incidente con pruebas de restauración. | Simulacro y registro. | Pendiente | Sí |
| SEC-10 | Pruebas | Revisión conforme OWASP ASVS 5.0 L2 de controles aplicables; pruebas negativas, autenticación, autorización y entradas. | Informe de evidencia con riesgos residuales aceptados. | Pendiente | Sí |
| OPS-01 | Inventario | Alta inicial cero; stock por variante y aroma; cantidad insuficiente cambia pedido completo a fabricación si se permite. | Pruebas automatizadas + visuales. | Implementado sin verificar (lógica parcial) | Sí |
| OPS-02 | Catálogo | Precios y fotos editables desde UI con autorización y versionamiento/auditoría; productos en draft por defecto. | Prueba end-to-end multiusuario. | Pendiente | Sí |
| OPS-03 | No publicación | `main`, DNS y web vigente no se modifican hasta autorización explícita y aceptación de controles. | Revisión de diff/infra y aprobación. | Pendiente | Sí |

## Decisiones de arquitectura
- Mantener `admin.chusquisimas.com` protegido con Cloudflare Access.
- Mantener `chusquisimas.com` como tienda pública. Acciones críticas no deben depender solo del aislamiento de DNS.
- D1 `chusquisimas-v2-db`, R2 privado `chusquisimas-v2-images`: están creados, pero ningún resultado de ejecución remota o migración se presume.
- No almacenar documentos de identidad, contraseñas ni datos tributarios sensibles en este repositorio público.
- Inicializar productos como borradores y existencias en cero; precio desconocido como `NULL`.
- WhatsApp genera solicitudes: no implica pago, reserva de stock ni aceptación automática de un contrato.

## Regla de aprobación
Un control pasa a `Aprobado` solo al registrar: quién verificó, fecha, prueba/evidencia enlazada y (si procede) revisión jurídica o contable. La autorización de publicación debe ser explícita y separada de los commits.

## Fuentes normativas y técnicas
- Ley 1480 de 2011, Estatuto del Consumidor: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306
- Ley 2439 de 2024: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=257116
- Ley 1581 de 2012, protección de datos: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981
- DIAN RUT: https://www.dian.gov.co/impuestos/RUT/Paginas/Inscripcion-y-actualizacion-RUT.aspx
- SIC sobre retracto: https://sedeelectronica.sic.gov.co/noticias/se-arrepintio-de-una-compra-y-no-sabe-que-hacer
- SIC sobre enlace institucional: https://sedeelectronica.sic.gov.co/publicaciones/boletin-juridico/concepto/titulo-obligacion-de-incluir-enlace-la-superindustria-en-plataformas-de-comercio-electronico
- OWASP ASVS 5.0: https://github.com/OWASP/ASVS/tree/v5.0.0

Nota: evaluar vigencia, interpretación y aplicabilidad concreta con asesor local antes de ventas.
