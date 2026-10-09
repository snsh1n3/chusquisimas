import assert from "node:assert/strict";
import test from "node:test";
import { verifyAccessToken } from "../../src/lib/admin/access-jwt.ts";

const config = {
  teamDomain: "chusquisimas.cloudflareaccess.com",
  audience: "example-aud-for-tests",
};

test("rejects missing token before any Access fetch", async () => {
  await assert.rejects(verifyAccessToken(null, config), /Token de Access requerido/);
});

test("rejects unsafe team domains (prevents arbitrary JWKS fetch)", async () => {
  await assert.rejects(
    verifyAccessToken("a.b.c", { ...config, teamDomain: "example.com" }),
    /Dominio de Access no configurado/
  );
});

test("rejects unsigned and malformed tokens", async () => {
  await assert.rejects(verifyAccessToken("bad.token", config), /JWT inválido/);
  const jwt = [
    btoa(JSON.stringify({alg:"none",kid:"bad"})),
    btoa(JSON.stringify({sub:"someone"})),
    "signature",
  ].join(".");
  await assert.rejects(verifyAccessToken(jwt, config));
});
