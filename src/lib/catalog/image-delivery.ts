/**
 * Política de entrega de fotografías públicas.
 *
 * Cada carga crea un id nuevo (UUID) y el archivo de R2 nunca se sobrescribe,
 * así que el contenido de /api/images/<id> es inmutable: el id funciona como
 * versión. Lo único que cambia es si el producto sigue publicado, y eso se
 * revisa en D1 en cada solicitud antes de servir nada.
 *
 * - Navegador: 5 minutos. Ocultar un producto deja de servir su foto como
 *   máximo 5 minutos después en navegadores que ya la tenían.
 * - Worker (Cache API): 1 día para el contenido. Evita leer R2 en cada visita;
 *   el control de publicación en D1 sigue aplicándose siempre.
 * - ETag fijo por id: un navegador con la foto recibe 304 sin descargarla.
 */

export type ImageSize = "full" | "thumb";

export const BROWSER_MAX_AGE_SECONDS = 300;
export const EDGE_MAX_AGE_SECONDS = 86_400;

export const PUBLIC_IMAGE_CACHE_CONTROL = `public, max-age=${BROWSER_MAX_AGE_SECONDS}`;
export const EDGE_IMAGE_CACHE_CONTROL = `public, max-age=${EDGE_MAX_AGE_SECONDS}`;

const IMAGE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isImageId(value: string): boolean {
  return IMAGE_ID_PATTERN.test(value);
}

export function imageEtag(imageId: string, size: ImageSize = "full"): string {
  return `"img-${imageId.toLowerCase()}${size === "thumb" ? "-thumb" : ""}"`;
}

/** Rutas públicas de una foto (principal y miniatura). */
export function publicImagePaths(imageId: string): { src: string; thumbSrc: string } {
  return { src: `/api/images/${imageId}`, thumbSrc: `/api/images/${imageId}/thumb` };
}

/** Evalúa If-None-Match (lista separada por comas, admite W/ y *). */
export function matchesEtag(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch.split(",").some((candidate) => {
    const value = candidate.trim().replace(/^W\//, "");
    return value === "*" || value === etag;
  });
}

/** Clave interna de la Cache API; no es una URL pública ni enrutable. */
export function edgeCacheKey(origin: string, imageId: string, size: ImageSize = "full"): string {
  return `${origin}/__edge-cache/product-images/${imageId.toLowerCase()}/${size}`;
}

export function publicImageHeaders(imageId: string, size: ImageSize = "full"): Record<string, string> & { ETag: string } {
  return {
    "Content-Type": "image/webp",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": PUBLIC_IMAGE_CACHE_CONTROL,
    ETag: imageEtag(imageId, size),
  };
}
