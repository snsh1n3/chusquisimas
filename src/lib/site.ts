/** Datos públicos del sitio, compartidos por metadata, pie de página y SEO. */
export const SITE_URL = "https://chusquisimas.com";
export const SITE_NAME = "Chusquisimas";
export const SITE_TAGLINE = "Crea ambiente, enciende tu chusquísima.";
export const SITE_DESCRIPTION =
  "Velas aromáticas y wax melts hechos a mano en Colombia, con envase de cemento y cera de soya.";
export const INSTAGRAM_URL = "https://www.instagram.com/chusquisimas.co/";
export const INSTAGRAM_HANDLE = "@chusquisimas.co";
/** Identificador del contenido principal, destino del enlace "Saltar al contenido". */
export const MAIN_CONTENT_ID = "contenido";

/** Next reemplaza (no combina) openGraph entre layout y página: cada página lo reutiliza. */
export const OPEN_GRAPH_DEFAULTS = {
  type: "website",
  siteName: SITE_NAME,
  locale: "es_CO",
} as const;
