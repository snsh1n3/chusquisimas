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

test("la categoría elegida en el panel se aplica aunque el tipo no cambie", async () => {
  const db = setup();
  db.raw.exec("INSERT INTO store_categories (id, slug, name, sort_order) VALUES ('cat-wax-melts','wax-melts','Wax melts',2)");
  await editProduct(db as unknown as ProductDatabase, { id: "product-peb", expectedName: "Pebetero Panal",
    name: "Pebetero Panal", description: "", productType: "custom", categoryId: "cat-wax-melts" }, "u1", "a1");
  assert.deepEqual(categories(db), ["cat-wax-melts"]);
  const audit = db.raw.prepare("SELECT details_json FROM admin_audit_log WHERE id='a1'").get() as { details_json: string };
  const details = JSON.parse(audit.details_json);
  assert.equal(details.old_category, "cat-pebeteros");
  assert.equal(details.new_category, "cat-wax-melts");
});

test("rechaza categorías que no existen en el catálogo", async () => {
  const db = setup();
  await assert.rejects(editProduct(db as unknown as ProductDatabase, { id: "product-peb", expectedName: "Pebetero Panal",
    name: "Pebetero Panal", description: "", productType: "custom", categoryId: "cat-inventada" }, "u1", "a1"),
    /Categoría inválida/);
  assert.deepEqual(categories(db), ["cat-pebeteros"]);
});

test("crear un producto con categoría elegida", async () => {
  const db = setup();
  const { createDraftProduct } = await import("../../src/lib/admin/product-service.ts");
  await createDraftProduct(db as unknown as ProductDatabase, { name: "Pebetero Estrella", description: "",
    productType: "custom", categoryId: "cat-pebeteros" }, "u1", "product-estrella", "a2");
  const rows = db.raw.prepare("SELECT category_id FROM store_product_categories WHERE product_id='product-estrella'").all();
  assert.deepEqual(rows.map((row) => (row as { category_id: string }).category_id), ["cat-pebeteros"]);
  await createDraftProduct(db as unknown as ProductDatabase, { name: "Kit Navidad", description: "",
    productType: "kit" }, "u1", "product-kit", "a3");
  const kit = db.raw.prepare("SELECT category_id FROM store_product_categories WHERE product_id='product-kit'").get() as
    { category_id: string };
  assert.equal(kit.category_id, "cat-kits");
});
