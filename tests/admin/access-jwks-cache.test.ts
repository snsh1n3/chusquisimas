import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { generateKeyPairSync, sign } from "node:crypto";

import {
  JWKS_MIN_REFRESH_MS, JWKS_TTL_MS, setJwksClockForTests, verifyAccessToken,
} from "../../src/lib/admin/access-jwt.ts";

const teamDomain = "cache-org.cloudflareaccess.com";
const audience = "aud-cache";
const cfg = { teamDomain, audience };
const toPart = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

function keyPair(kid: string) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return { kid, privateKey, jwk: { ...publicKey.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" } };
}

function token(pair: ReturnType<typeof keyPair>) {
  const parts = [
    toPart({ alg: "RS256", kid: pair.kid, typ: "JWT" }),
    toPart({
      iss: `https://${teamDomain}`, aud: audience, sub: "s", email: "owner@example.com",
      exp: Math.floor(Date.now() / 1000) + 300,
    }),
  ];
  const signature = sign("RSA-SHA256", Buffer.from(parts.join(".")), pair.privateKey).toString("base64url");
  return [...parts, signature].join(".");
}

/** fetch simulado que cuenta llamadas y publica las claves indicadas. */
function jwksServer(initial: Array<ReturnType<typeof keyPair>>) {
  let published = initial;
  const state = { calls: 0 };
  const fetchJwks = (async () => {
    state.calls += 1;
    return { ok: true, json: async () => ({ keys: published.map((p) => p.jwk) }) };
  }) as unknown as typeof fetch;
  return { state, fetchJwks, publish: (next: typeof initial) => { published = next; } };
}

let now = 1_000_000;
const advance = (ms: number) => { now += ms; };

afterEach(() => setJwksClockForTests(null));

describe("JWKS cache", () => {
  it("reutiliza las claves durante el TTL", async () => {
    setJwksClockForTests(() => now);
    const k1 = keyPair("k1");
    const server = jwksServer([k1]);
    await verifyAccessToken(token(k1), cfg, server.fetchJwks);
    advance(JWKS_TTL_MS - 1);
    await verifyAccessToken(token(k1), cfg, server.fetchJwks);
    assert.equal(server.state.calls, 1);
  });

  it("vuelve a consultar al vencer el TTL", async () => {
    setJwksClockForTests(() => now);
    const k1 = keyPair("k1");
    const server = jwksServer([k1]);
    await verifyAccessToken(token(k1), cfg, server.fetchJwks);
    advance(JWKS_TTL_MS);
    await verifyAccessToken(token(k1), cfg, server.fetchJwks);
    assert.equal(server.state.calls, 2);
  });

  it("refresca ante un kid nuevo (rotación) pasado el intervalo mínimo", async () => {
    setJwksClockForTests(() => now);
    const k1 = keyPair("k1");
    const k2 = keyPair("k2");
    const server = jwksServer([k1]);
    await verifyAccessToken(token(k1), cfg, server.fetchJwks);
    server.publish([k1, k2]);
    advance(JWKS_MIN_REFRESH_MS);
    const identity = await verifyAccessToken(token(k2), cfg, server.fetchJwks);
    assert.equal(identity.email, "owner@example.com");
    assert.equal(server.state.calls, 2);
  });

  it("no permite forzar consultas con kids inventados", async () => {
    setJwksClockForTests(() => now);
    const k1 = keyPair("k1");
    const forged = keyPair("forged");
    const server = jwksServer([k1]);
    await verifyAccessToken(token(k1), cfg, server.fetchJwks);
    for (let i = 0; i < 5; i++) {
      await assert.rejects(verifyAccessToken(token(forged), cfg, server.fetchJwks), /Clave Access desconocida/);
    }
    assert.equal(server.state.calls, 1, "sin consultas extra dentro del intervalo mínimo");
  });

  it("una clave retirada deja de aceptarse tras el TTL", async () => {
    setJwksClockForTests(() => now);
    const k1 = keyPair("k1");
    const k2 = keyPair("k2");
    const server = jwksServer([k1]);
    await verifyAccessToken(token(k1), cfg, server.fetchJwks);
    server.publish([k2]);
    advance(JWKS_TTL_MS);
    await assert.rejects(verifyAccessToken(token(k1), cfg, server.fetchJwks), /Clave Access desconocida/);
  });

  it("sigue rechazando firmas inválidas aunque la clave esté en caché", async () => {
    setJwksClockForTests(() => now);
    const k1 = keyPair("k1");
    const server = jwksServer([k1]);
    const valid = token(k1);
    await verifyAccessToken(valid, cfg, server.fetchJwks);
    const [h, , sig] = valid.split(".");
    const tampered = [h, toPart({ iss: `https://${teamDomain}`, aud: audience, sub: "x",
      email: "attacker@example.com", exp: Math.floor(Date.now() / 1000) + 300 }), sig].join(".");
    await assert.rejects(verifyAccessToken(tampered, cfg, server.fetchJwks), /Firma JWT de Access inválida/);
  });
});
