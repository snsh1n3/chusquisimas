import assert from "node:assert/strict";
import test from "node:test";
import { BOGOTA, COLOMBIA_DEPARTMENTS, isColombianCity } from "../../src/data/colombia/municipalities.ts";

test("33 entidades: 32 departamentos y Bogotá D.C., con 1.104 municipios", () => {
  assert.equal(COLOMBIA_DEPARTMENTS.length, 33);
  assert.equal(COLOMBIA_DEPARTMENTS.reduce((sum, d) => sum + d.cities.length, 0), 1104);
  assert.equal(COLOMBIA_DEPARTMENTS[0].name, BOGOTA);
});

test("Bogotá solo existe como Bogotá D.C.", () => {
  assert.ok(isColombianCity(BOGOTA, BOGOTA));
  assert.ok(!isColombianCity("Cundinamarca", "Bogotá"));
  assert.ok(isColombianCity("Guainía", "Barrancominas"));
  assert.ok(isColombianCity("Antioquia", "Medellín"));
});

test("sin municipios repetidos dentro de un departamento", () => {
  for (const department of COLOMBIA_DEPARTMENTS) {
    assert.equal(new Set(department.cities).size, department.cities.length, department.name);
  }
});
