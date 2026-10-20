# Chusquisimas

Tienda en línea de **Chusquisimas**, velas artesanales hechas a mano en Colombia.

- Tienda: [chusquisimas.com](https://chusquisimas.com)
- Panel administrativo: `admin.chusquisimas.com` (protegido con Cloudflare Access)

[![CI](https://github.com/snsh1n3/chusquisimas/actions/workflows/ci.yml/badge.svg)](https://github.com/snsh1n3/chusquisimas/actions/workflows/ci.yml)
[![CodeQL](https://github.com/snsh1n3/chusquisimas/actions/workflows/codeql.yml/badge.svg)](https://github.com/snsh1n3/chusquisimas/actions/workflows/codeql.yml)

## Stack

| Capa | Tecnología |
|---|---|
| Aplicación | Next.js 16 (App Router, Turbopack), React 19 con React Compiler, TypeScript estricto |
| Estilos | Tailwind CSS 4 con tokens semánticos ([docs/design-tokens.md](docs/design-tokens.md)) |
| Ejecución | Cloudflare Workers mediante OpenNext (`@opennextjs/cloudflare`) |
| Datos | Cloudflare D1 (catálogo, inventario, usuarios del panel, auditoría) |
| Imágenes | Cloudflare R2 privado + binding Images (miniaturas WebP) |
| Acceso al panel | Cloudflare Access (JWT verificado) + permisos en D1 |
| Observabilidad | Workers Logs con eventos JSON estructurados ([docs/observabilidad.md](docs/observabilidad.md)) |

## Estructura

```
src/
  app/            Rutas: tienda pública, /tienda/[slug], /admin y /api
  components/     UI pública, del panel y de producto
  data/           Datos locales del catálogo (categorías y referencias base)
  lib/            Dominio: catálogo, pedidos, admin, seguridad, observabilidad, SEO
  types/          Tipos del catálogo
migrations/       Esquema D1 (wrangler d1 migrations)
seeds/            Catálogo inicial para entornos locales
tests/            Pruebas unitarias (node:test) e integración (Python + SQLite)
docs/             Decisiones de arquitectura, seguridad, calidad web y cumplimiento
graphify-out/     Grafo de código (Graphify) para navegar el proyecto
```

## Requisitos

- Node.js 24 (versión fijada en [.nvmrc](.nvmrc))
- npm (el `package-lock.json` es la fuente de las versiones exactas)
- Python 3 para las pruebas de integración
- Acceso a la cuenta de Cloudflare para desplegar

## Desarrollo local

```bash
npm ci
npx wrangler d1 migrations apply chusquisimas-v2-db --local
npx wrangler d1 execute chusquisimas-v2-db --local --file=./seeds/initial_catalog.sql
npm run dev
```

`next dev` usa los bindings locales de Wrangler (D1, R2, Images) gracias a
`initOpenNextCloudflareForDev()` en `next.config.ts`. Los secretos locales van
en `.dev.vars`, que nunca se versiona.

## Verificación

| Comando | Qué valida |
|---|---|
| `npm run lint` | ESLint con las reglas de Next.js y Core Web Vitals |
| `npm run typecheck` | TypeScript sin emitir |
| `npm test` | Pruebas unitarias |
| `python3 tests/integration/check_*.py` | Esquema, transacciones auditadas, RBAC y aislamiento del despliegue |
| `npm run build` | Build de producción |

CI ejecuta todo lo anterior en cada push a `main` y en cada pull request.

## Despliegue

El despliegue es manual desde un equipo autorizado:

```bash
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
```

Despliega solo commits con CI en verde, incluida la **prueba de humo del
Worker**, que arma el Worker con OpenNext y prueba las rutas en el runtime de
Workers. `next build` por sí solo no detecta incompatibilidades entre Next y
OpenNext: así se rompió producción el 20-oct-2026 con Next 16.4.0.

Si un despliegue falla (error 1101 o 500), vuelve de inmediato a la versión
anterior y luego revisa Observability → Events en Cloudflare:

```bash
npx wrangler rollback --message "motivo"
```

El Worker se llama `chusquisimas-v2` y conserva sus dominios. Las migraciones
remotas de D1 nunca se ejecutan automáticamente: se aplican a mano después de
respaldar la base (`npx wrangler d1 export chusquisimas-v2-db --remote --output=respaldo.sql`).

## Automatizaciones de GitHub

- **CI** ([ci.yml](.github/workflows/ci.yml)): lint, tipos, pruebas, integración y build. En pull requests revisa además las dependencias nuevas.
- **CodeQL** ([codeql.yml](.github/workflows/codeql.yml)): análisis de seguridad semanal y en cada cambio.
- **Auditoría** ([audit.yml](.github/workflows/audit.yml)): `npm audit` cada lunes; falla solo con vulnerabilidades altas o críticas en producción.
- **Dependabot** ([dependabot.yml](.github/dependabot.yml)): PR semanales agrupados, con 7 días de espera ante versiones recién publicadas.

## Documentación

| Documento | Tema |
|---|---|
| [seguridad-cabeceras-rbac.md](docs/seguridad-cabeceras-rbac.md) | CSP, HSTS, cabeceras y permisos del panel |
| [observabilidad.md](docs/observabilidad.md) | Eventos, categorías de error y consultas en Workers Logs |
| [web-quality.md](docs/web-quality.md) | Accesibilidad, SEO y Lighthouse |
| [design-tokens.md](docs/design-tokens.md) | Tokens de diseño y reglas de uso |
| [pagos-arquitectura.md](docs/pagos-arquitectura.md) | Arquitectura propuesta para la pasarela de pagos |
| [matriz-cumplimiento-colombia-seguridad.md](docs/matriz-cumplimiento-colombia-seguridad.md) | Controles legales y de seguridad antes de vender en línea |
| [cloudflare-resources.md](docs/cloudflare-resources.md) | Recursos y bindings de Cloudflare |

## Seguridad

Reporta vulnerabilidades de forma privada según [SECURITY.md](SECURITY.md).

## Licencia

Código y marca con todos los derechos reservados. Ver [LICENSE](LICENSE).
