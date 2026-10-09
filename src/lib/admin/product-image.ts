/** Validate uploaded product images before persisting them in R2.
 * Only re-encoded raster formats are accepted; SVG and user-supplied filenames
 * are never used as a storage key.
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type ProductImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export function identifyRasterImage(bytes: Uint8Array): ProductImageType | null {
  if (bytes.length >= 8 &&
      [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value)) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 &&
      bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0,4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return "image/webp";
  return null;
}

/** Signature check is only a first gate, not a substitute for decoding/re-encoding. */
export function validateProductImage(
  bytes: Uint8Array,
  declaredType: string
): ProductImageType {
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES)
    throw new Error("La imagen debe tener entre 1 byte y 5 MB.");
  const recognizedType = identifyRasterImage(bytes);
  if (!recognizedType || recognizedType !== declaredType)
    throw new Error("Formato de imagen no permitido.");
  return recognizedType;
}

export function buildPrivateImageKey(productId: string, imageId: string, type: ProductImageType): string {
  if (!/^product-[a-z0-9-]{1,100}$/.test(productId) ||
      !/^[0-9a-f-]{36}$/.test(imageId))
    throw new Error("Identificadores inválidos.");
  const extension = type === "image/png" ? "png" : type === "image/jpeg" ? "jpg" : "webp";
  return `products/${productId}/${imageId}.${extension}`;
}
