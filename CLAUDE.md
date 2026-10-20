# Chusquisimas — guía para agentes

- Idioma de trabajo: español (código y nombres en inglés, textos y docs en español).
- Rama de trabajo: `main` (es lo que está en producción). Push directo autorizado; CI debe quedar en verde.
- No modificar `package-lock.json` sin aprobación previa: las dependencias nuevas o actualizadas se proponen primero.
- No desplegar ni ejecutar migraciones remotas de D1: el despliegue lo hace el responsable desde su equipo.
- Antes de leer archivos, consultar el grafo en `graphify-out/` (ver `.graphifyignore`).
- La tienda pública solo consume `PublicCatalog` (sin inventario). Hay una prueba que lo vigila.
- Componentes: solo tokens semánticos de `globals.css` (sin hex, `bg-white` ni `brand-*`).
- Rutas `/api/admin/*`: envolver con `withApiLogging` y responder errores con `adminErrorResponse`.
- Etiquetas de estado al reportar: Confirmado, Pendiente de verificar, Propuesto, Implementado y probado.
