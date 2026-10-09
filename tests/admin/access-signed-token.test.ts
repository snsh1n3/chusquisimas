import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyAccessToken } from "../../src/lib/admin/access-jwt.ts";

const teamDomain = "test-org.cloudflareaccess.com";
const audience = "expected-audience";
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const jwk = { ...publicKey.export({ format: "jwk" }),
  kid: "test-key", alg: "RS256", use: "sig" };
const toPart = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const claims = (override: Record<string, unknown> = {}) => ({
  iss: `https://${teamDomain}`, aud: [audience],
  exp: Math.floor(Date.now() / 1000) + 300,
  sub: "mock-user", email: "owner@example.com",
  ...override,
});
function signedToken(payload: object) {
  const parts = [toPart({ alg: "RS256", kid: "test-key", typ: "JWT" }), toPart(payload)];
  const signature = sign("RSA-SHA256", Buffer.from(parts.join(".")), privateKey)
    .toString("base64url");
  return [...parts, signature].join(".");
}
const fetchJwks = (async () =>
  ({ ok: true, json: async () => ({ keys: [jwk] }) })) as typeof fetch;
const cfg = { teamDomain, audience };

test("accepts properly signed Access token with expected audience", async () => {
  const identity = await verifyAccessToken(signedToken(claims()), cfg, fetchJwks);
  assert.deepEqual(identity, { subject: "mock-user", email: "owner@example.com" });
});

test("rejects expired tokens and wrong audience", async () => {
  await assert.rejects(verifyAccessToken(signedToken(claims({
    exp: Math.floor(Date.now() / 1000) - 1,
  })), cfg, fetchJwks));
  await assert.rejects(verifyAccessToken(signedToken(claims({
    aud: ["not-ours"],
  })), cfg, fetchJwks));
});

test("rejects tampered claims with invalid RSA signature", async () => {
  const token = signedToken(claims());
  const [header,,signature] = token.split(".");
  const modified = [header,toPart(claims({ email: "attacker@example.com" })),signature].join(".");
  await assert.rejects(verifyAccessToken(modified, cfg, fetchJwks),
    /Firma JWT de Access inválida/);
});
