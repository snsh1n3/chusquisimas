# Tokens de diseño — Chusquisimas V2

Fuente única de colores, forma y foco de la tienda y del panel admin. Todo vive en `src/app/globals.css`.

## Cómo funciona

1. **Primitivos** (`--palette-*`): los valores de la marca (crema, tinta, naranja…). **En un rediseño se cambian estos valores, y nada más si la estructura no cambia.**
2. **Semánticos** (`--page`, `--fg`, `--action`…): el **rol** de cada color. Cada uno apunta a un primitivo.
3. **Utilidades de Tailwind** (`bg-page`, `text-fg`, `bg-action`…): las generan los semánticos en `@theme inline`. **Los componentes usan solo estas utilidades.**

Reglas:

- **Prohibido en componentes:** hex sueltos (`bg-[#…]`), `bg-white`, `text-white`, primitivos y colores de la paleta por defecto de Tailwind (`red-700`, `stone-…`).
- Si un diseño trae un **rol nuevo** (por ejemplo, "fondo de promoción"), se crea un token semántico nuevo. No se reutiliza uno que signifique otra cosa.

## Mapa de tokens

| Utilidad | Rol | Primitivo actual | Valor |
|---|---|---|---|
| `bg-page` | Fondo general | `--palette-cream` | `#F7F1E9` |
| `bg-panel` | Secciones alternas, cabecera de tablas, marcadores de foto | `--palette-cream-deep` | `#EDE3D7` |
| `bg-surface` | Tarjetas, formularios, header | `--palette-warm-white` | `#FFFDF9` |
| `text-fg` | Texto principal, iconos | `--palette-ink` | `#231F20` |
| `text-fg-muted` | Texto secundario, ayudas, SKU, estados vacíos | `--palette-taupe` | `#66584D` |
| `text-fg-accent` | Etiquetas pequeñas en naranja ("eyebrows"), hover de enlaces | `--palette-orange-deep` | `#B84A12` |
| `bg-action` + `text-on-action` | **CTA principal** (uno por vista): Pedir, Ver tienda | naranja + tinta | `#F16623` / `#231F20` |
| `hover:bg-action-hover` + `hover:text-on-action-hover` | Hover del CTA principal | tinta + blanco cálido | `#231F20` / `#FFFDF9` |
| `bg-inverse` + `text-on-inverse` | Botones del panel, chip o filtro activo, footer | tinta + blanco cálido | `#231F20` / `#FFFDF9` |
| `bg-danger` + `text-on-danger` / `text-danger` / `border-danger` | Eliminar, errores del panel | `--palette-red` | `#B83817` |
| `bg-accent` + `text-on-accent` | Rellenos decorativos de marca que **no** son botones (tarjetas de categoría, figuras del hero) | naranja + tinta | `#F16623` / `#231F20` |
| `bg-highlight` + `text-on-highlight` | Detalles e insignias ("Entrega inmediata", "Principal"), selección de texto | amarillo + tinta | `#FFCC01` / `#231F20` |
| `border-line` | Separadores y contornos decorativos | tinta al 14% | `rgba(35,31,32,.14)` |
| `border-line-strong` | Contornos marcados (botón contorneado, opción en hover) | tinta | `#231F20` |
| `border-line-control` | Bordes de inputs, selects y opciones (deben verse) | `--palette-taupe-line` | `#857868` |
| `border-selected` | Miniatura u opción seleccionada | naranja oscuro | `#B84A12` |
| `outline-focus` / `:focus-visible` | Anillo de foco de teclado | naranja oscuro | `#B84A12` |
| `rounded-card` / `rounded-button` | Radios de tarjeta y botón | — | `1.5rem` / `9999px` |
| `shadow-hard` | Sombra dura de la marca (máximo un elemento por vista) | — | `4px 4px 0 #231F20` |

## Contrastes verificados (WCAG 2.2)

**Mínimos:**
- Texto normal: 4.5:1.
- Texto grande o en negrita de 18,66 px o más: 3:1.
- Bordes, foco e indicadores (no texto): 3:1.

| Par | Contraste | Resultado |
|---|---|---|
| `fg` sobre `page` / `panel` | 14.53 / 12.86 | ✅ |
| `fg-muted` sobre `page` / `panel` / `surface` | 6.10 / 5.40 / 6.74 | ✅ |
| `fg-accent` sobre `page` / `surface` | 4.65 / 5.13 | ✅ |
| `fg-accent` sobre `panel` | 4.12 | ⚠️ **No usar para texto normal sobre `panel`** |
| `on-action` sobre `action` | 5.17 | ✅ |
| `on-action-hover` sobre `action-hover` | 16.04 | ✅ |
| `on-inverse` sobre `inverse` | 16.04 | ✅ |
| `on-danger` sobre `danger` / `danger` sobre `surface` | 5.72 / 5.72 | ✅ |
| `on-highlight` sobre `highlight` | 10.78 | ✅ |
| `line-control` sobre `surface` / `page` | 4.23 / 3.83 | ✅ (no texto) |
| `focus` y `selected` sobre `page` / `surface` | 4.65 / 5.13 | ✅ (no texto) |

**Combinaciones prohibidas:**
- Naranja `#F16623` como texto sobre crema: 2.81:1.
- Texto blanco sobre el naranja: 3.15:1.
- Amarillo como texto sobre crema: 1.35:1.

El naranja y el amarillo se usan como relleno, nunca como tinta.

## Cómo aplicar el rediseño

Cuando el diseño final esté en Figma o Adobe XD:

1. **Pedir a la diseñadora:**
   - El valor de cada **rol** de la tabla del mapa. Si un rol no cambia, se deja igual.
   - Los roles nuevos que su diseño necesite.
   - Tipografía (familia y pesos), radios y sombras.
2. **Actualizar los primitivos** `--palette-*` en `globals.css`. Si un rol pasa a usar otro color, se cambia a qué primitivo apunta el semántico.
3. **Recalcular la tabla de contrastes.** Si algún par baja del mínimo, se ajusta el tono (por ejemplo, otro naranja oscuro para texto) antes de publicar.
4. **Actualizar la skill `chusquisimas-brand-design`** con los valores nuevos para que el diseño y el código sigan alineados.
5. **Comprobar que no se hayan colado colores sueltos.** Este comando no debe devolver nada:

   ```powershell
   Select-String -Path src\**\*.tsx -Pattern '#[0-9a-fA-F]{6}|text-white|bg-white|brand-'
   ```

## Historial

- **19 oct 2026.**
  - Se creó la capa semántica.
  - Se migraron 49 colores sueltos y todos los usos directos de primitivos en la tienda y el panel.
  - El CTA principal pasa a naranja con texto en tinta, incluido "Pedir", que antes era rojo `#B43E28`.
  - Se confirma `#B84A12` como naranja para texto y foco.
  - El borde de inputs pasa de `#C8BDB1` (1.8:1) a `#857868`.
  - El texto atenuado pasa de tinta al 45% (2.7:1) a `#66584D`.
  - Se unificaron cuatro naranjas y rojos oscuros (`#C86021`, `#B43E28`, `#9A3421` y `#B83817`) en `fg-accent` y `danger`.
