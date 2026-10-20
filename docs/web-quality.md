# Pasada de calidad web (19 oct 2026)

Revisión de accesibilidad y SEO técnico sobre el código y la página en producción
(versión `3b5a2afc`). Sin medición de Lighthouse: queda para después del despliegue.

## Corregido

| Área | Hallazgo | Severidad | Corrección |
|---|---|---|---|
| Accesibilidad | La cabecera estaba dentro de `<main>` y no había enlace para saltar al contenido | Alta | `PublicShell`: enlace "Saltar al contenido", `header`, `main#contenido` y `footer` como regiones de primer nivel |
| Accesibilidad | El menú móvil no cerraba con Escape ni al cambiar de página | Media | Escape cierra y devuelve el foco al botón; se cierra al navegar |
| Accesibilidad | Las presentaciones del panel de pedido no mostraban el foco del teclado y las agotadas solo se distinguían por opacidad | Media | Anillo de foco en la etiqueta y texto "· Agotado" |
| Accesibilidad | Enlaces que abren WhatsApp o Instagram sin aviso | Baja | Texto oculto "(se abre WhatsApp)" o "(se abre en una pestaña nueva)" |
| Accesibilidad | Etiquetas sin tilde ("Navegacion", "menu") | Baja | Corregidas |
| SEO | `/tienda` repetía la marca en el título ("Tienda \| Chusquisimas \| Chusquisimas") | Media | Título "Tienda" con la plantilla del layout |
| SEO | Sin `robots.txt` propio ni `sitemap.xml` | Media | `robots.txt` por host (el panel bloquea todo) y sitemap dinámico con fichas y fotos |
| SEO | Sin `metadataBase`, `canonical` ni Open Graph en inicio y tienda | Media | Metadata global con `es_CO`, canonical en inicio, tienda y categorías |
| SEO | Sin datos de la organización | Baja | JSON-LD `Organization` con logo e Instagram |
| Contenido | Pie de página decía "Vista preliminar V2 · No publicada" | Media | Pie nuevo en todas las páginas con tienda, WhatsApp e Instagram |
| Contenido | Sin página 404 de la marca | Baja | `not-found.tsx` con la mascota |

## Ajustes posteriores (19 oct)

- Radios alineados a la guía: tarjetas y paneles 16 px (`rounded-card`), controles y miniaturas 12 px (`rounded-control`); sin sombras difusas, con elevación de 2 px al pasar sobre las tarjetas de producto.
- CSP en modo bloqueante.

## Lighthouse (19 oct, versión desplegada)

| Hallazgo | Decisión |
|---|---|
| CSS que bloquea el render (7,1 KiB) y cadena HTML → CSS; el texto del LCP esperaba 740 ms (móvil) y 960 ms (escritorio) | `experimental.inlineCss`: el CSS va dentro del HTML |
| Legacy JavaScript (14 KiB de polyfills) | Los incluye Next.js en todos los navegadores (`polyfill-module`). Revisado el 20-oct: el archivo real pesa ~1,4 KB, la auditoría no puntúa y quitarlo exige un alias a un archivo interno de Next que puede romperse en cada actualización y dejar sin soporte a iPhone con iOS 16–17. Se mantiene; el piso de navegadores queda explícito en `browserslist` |
| JavaScript sin usar (30 KiB) | Parte de React en la carga inicial; sin acción |
| Tarea larga de 88 ms (hidratación) | Aceptable; sin acción |
| Tamaño del DOM (96 elementos) | Bien |

### Línea base antes del rediseño

Después de `inlineCss` (commit `fd5a533`): **Performance 100 en móvil y 100 en escritorio** (Lighthouse, inicio). Cualquier cambio del rediseño debe mantenerse en ese rango; si baja, revisar primero imágenes del hero, fuentes nuevas y efectos con canvas o shaders.

## Pendiente

- Imagen Open Graph de 1200×630 (PNG o JPG) para inicio y tienda: la diseña el rediseño.
- Medir con Lighthouse (accesibilidad, SEO, buenas prácticas) en móvil después del despliegue.
- Prueba con VoiceOver en el iPhone: menú, galería y panel de pedido.
