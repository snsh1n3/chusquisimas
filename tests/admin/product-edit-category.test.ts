import assert from "node:assert/strict";
import test from "node:test";
import { editProduct, type ProductDatabase } from "../../src/lib/admin/product-service.ts";
import { createTestDatabase } from "../helpers/d1-sqlite.ts";

function setup() {
  const db = createTestDatabase();
  db.raw.exec(`
    INSERT INTO admin_users (id, email, status) VALUES ('u1', 'a@b.co', 'active');
    INSERT INTO store_categories (id, slug, name, sort_order) VALUES
      ('cat-personalizados','personalizados','Personalizados',3), ('cat-kits','kits','Kits',4);
    INSERT INTO store_products (id, slug, name, product_type) VALUES ('product-peb', 'peb', 'Pebetero Panal', 'custom');
    INSERT INTO store_product_categories VALUES ('product-peb', 'cat-pebeteros');
  `);
  return db;
}
const categories = (db: ReturnType<typeof setup>) =>
  db.raw.prepare("SELECT category_id FROM store_product_categories WHERE product_id='product-peb'").all()
    .map((row) => (row as { category_id: string }).category_id);

test("editar sin cambiar el tipo conserva la categoría asignada", async () => {
  const db = setup();
  await editProduct(db as unknown as ProductDatabase, { id: "product-peb", expectedName: "Pebetero Panal",
    name: "Pebetero Panal", description: "Para wax melts.", productType: "custom" }, "u1", "a1");
  assert.deepEqual(categories(db), ["cat-pebeteros"]);
});

test("cambiar el tipo reasigna la categoría por defecto", async () => {
  const db = setup();
  await editProduct(db as unknown as ProductDatabase, { id: "product-peb", expectedName: "Pebetero Panal",
    name: "Pebetero Panal", description: "", productType: "kit" }, "u1", "a1");
  assert.deepEqual(categories(db), ["cat-kits"]);
});

test("un nombre desactualizado no cambia nada", async () => {
  const db = setup();
  await assert.rejects(editProduct(db as unknown as ProductDatabase, { id: "product-peb", expectedName: "Otro",
    name: "X Y", description: "", productType: "kit" }, "u1", "a1"), /desactualizado/);
  assert.deepEqual(categories(db), ["cat-pebeteros"]);
});
