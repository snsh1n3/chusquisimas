/** Verify Cloudflare Access JWTs before granting administrative access.
 * The Access application must be configured on the dedicated admin hostname.
 * No trust is placed in Cf-Access-Authenticated-User-Email headers.
 */
export interface AccessIdentity {
  subject: string;
  email: string;
}

export interface AccessVerificationConfig {
  teamDomain: string;
  audience: string;
}

interface AccessClaims {
  iss?: unknown; aud?: unknown; exp?: unknown; nbf?: unknown;
  sub?: unknown; email?: unknown;
}

function base64urlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Token inválido");
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(bytes, (c) => c.charCodeAt(0));
}
function decodeJson<T>(part: string): T {
  return JSON.parse(new TextDecoder().decode(base64urlDecode(part))) as T;
}
function normalizeTeamDomain(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(trimmed)) {
    throw new Error("Dominio de Access no configurado");
  }
  return trimmed;
}

type AccessJwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

interface JwksCacheEntry {
  keys: AccessJwk[];
  fetchedAt: number;
}

/** Las claves de Access rotan con poca frecuencia; 5 minutos evita una consulta por solicitud. */
export const JWKS_TTL_MS = 5 * 60_000;
/**
 * Ante un `kid` desconocido se refresca de inmediato (rotación), pero como
 * mucho una vez cada 30 s: un atacante no puede forzar una consulta al JWKS
 * por cada token inventado.
 */
export const JWKS_MIN_REFRESH_MS = 30_000;

/**
 * Caché por instancia del Worker, separada por función de fetch para que las
 * pruebas con fetch simulados no compartan estado con producción.
 * Solo almacena claves públicas: la autorización se sigue validando en D1.
 */
const jwksCaches = new WeakMap<typeof fetch, Map<string, JwksCacheEntry>>();

let clock: () => number = () => Date.now();

/** Solo para pruebas: controla el reloj de la caché. */
export function setJwksClockForTests(next: (() => number) | null): void {
  clock = next ?? (() => Date.now());
}

function findSigningKey(keys: AccessJwk[], kid: string): AccessJwk | undefined {
  return keys.find((item) => item.kid === kid &&
    item.kty === "RSA" && item.alg === "RS256" && item.use === "sig");
}

async function fetchKeys(domain: string, fetchJwks: typeof fetch): Promise<AccessJwk[]> {
  const response = await fetchJwks(`https://${domain}/cdn-cgi/access/certs`, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudieron consultar las claves de Access");
  const jwks = await response.json() as { keys?: AccessJwk[] };
  return Array.isArray(jwks.keys) ? jwks.keys : [];
}

async function getSigningKey(domain: string, kid: string, fetchJwks: typeof fetch): Promise<AccessJwk> {
  let cache = jwksCaches.get(fetchJwks);
  if (!cache) {
    cache = new Map();
    jwksCaches.set(fetchJwks, cache);
  }
  const now = clock();
  const entry = cache.get(domain);
  const fresh = entry !== undefined && now - entry.fetchedAt < JWKS_TTL_MS;
  if (entry && fresh) {
    const cached = findSigningKey(entry.keys, kid);
    if (cached) return cached;
    if (now - entry.fetchedAt < JWKS_MIN_REFRESH_MS) throw new Error("Clave Access desconocida");
  }
  const keys = await fetchKeys(domain, fetchJwks);
  cache.set(domain, { keys, fetchedAt: now });
  const key = findSigningKey(keys, kid);
  if (!key) throw new Error("Clave Access desconocida");
  return key;
}

export async function verifyAccessToken(
  token: string | null | undefined,
  configuration: AccessVerificationConfig,
  fetchJwks: typeof fetch = fetch
): Promise<AccessIdentity> {
  const domain = normalizeTeamDomain(configuration.teamDomain);
  if (!configuration.audience.trim()) throw new Error("Audience no configurado");
  if (!token || token.length > 16000) throw new Error("Token de Access requerido");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("JWT inválido");
  const header = decodeJson<{ alg?: string; kid?: string; typ?: string }>(parts[0]);
  const claims = decodeJson<AccessClaims>(parts[1]);
  if (header.alg !== "RS256" || !header.kid || header.kid.length > 250) {
    throw new Error("Algoritmo o clave de JWT inválidos");
  }
  const now = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://${domain}`;
  const audience = claims.aud;
  const audienceMatches = typeof audience === "string"
    ? audience === configuration.audience
    : Array.isArray(audience) && audience.includes(configuration.audience);
  if (claims.iss !== expectedIssuer || !audienceMatches ||
      typeof claims.exp !== "number" || !Number.isFinite(claims.exp) ||
      claims.exp <= now || (typeof claims.nbf === "number" && claims.nbf > now) ||
      typeof claims.sub !== "string" || !claims.sub ||
      typeof claims.email !== "string" || !claims.email.includes("@")) {
    throw new Error("Identidad de Access no válida");
  }
  const key = await getSigningKey(domain, header.kid, fetchJwks);
  const cryptoKey = await crypto.subtle.importKey("jwk", key, {
    name: "RSASSA-PKCS1-v1_5", hash: "SHA-256",
  }, false, ["verify"]);
  const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = Uint8Array.from(base64urlDecode(parts[2])).buffer;
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", cryptoKey, signature, signedData
  );
  if (!valid) throw new Error("Firma JWT de Access inválida");
  return { subject: claims.sub, email: claims.email.toLowerCase() };
}
