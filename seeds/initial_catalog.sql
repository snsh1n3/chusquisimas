-- Optional initial data for a new D1 database after migration 0002.
-- All 19 references are drafts; no prices, images, or active variants are invented.
-- Safe to rerun; does not overwrite existing business edits.

INSERT OR IGNORE INTO store_categories(id,slug,name,sort_order) VALUES
  ('cat-velas-aromaticas','velas-aromaticas','Velas aromáticas',1),
  ('cat-wax-melts','wax-melts','Wax melts',2),
  ('cat-personalizados','personalizados','Personalizados',3),
  ('cat-kits','kits','Kits',4);

INSERT OR IGNORE INTO store_aromas(id,name) VALUES
  ('aroma-natilla','Natilla'),
  ('aroma-cafe','Café'),
  ('aroma-chocolate','Chocolate'),
  ('aroma-lulada','Lulada'),
  ('aroma-frutos-del-bosque','Frutos del bosque'),
  ('aroma-uva','Uva');

INSERT OR IGNORE INTO store_products(id,slug,name,product_type,status) VALUES
  ('product-titina','titina','Titina','candle','draft'),
  ('product-churras-queridas','churras-queridas','Churras queridas','candle','draft'),
  ('product-chuscas','chuscas','Chuscas','candle','draft'),
  ('product-regia','regia','Regia','candle','draft'),
  ('product-serendipia','serendipia','Serendipia','candle','draft'),
  ('product-candor','candor','Candor','candle','draft'),
  ('product-chia','chia','Chía','candle','draft'),
  ('product-quimera-grande','quimera-grande','Quimera grande','candle','draft'),
  ('product-quimera-pequena','quimera-pequena','Quimera pequeña','candle','draft'),
  ('product-chata','chata','Chata','candle','draft'),
  ('product-gnomo','gnomo','Gnomo','candle','draft'),
  ('product-carinito','carinito','Cariñito','candle','draft'),
  ('product-antojitos','antojitos','Antojitos','candle','draft'),
  ('product-foforro','foforro','Foforro','candle','draft'),
  ('product-calderito','calderito','Calderito','candle','draft'),
  ('product-happy','happy','Happy','wax_melt','draft'),
  ('product-halloween','halloween','Halloween','wax_melt','draft'),
  ('product-kit-brujas','kit-brujas','Kit brujas','kit','draft'),
  ('product-kit-navidad','kit-navidad','Kit Navidad','kit','draft');

INSERT OR IGNORE INTO store_product_categories(product_id,category_id) VALUES
  ('product-titina','cat-velas-aromaticas'),
  ('product-churras-queridas','cat-velas-aromaticas'),
  ('product-chuscas','cat-velas-aromaticas'),
  ('product-regia','cat-velas-aromaticas'),
  ('product-serendipia','cat-velas-aromaticas'),
  ('product-candor','cat-velas-aromaticas'),
  ('product-chia','cat-velas-aromaticas'),
  ('product-quimera-grande','cat-velas-aromaticas'),
  ('product-quimera-pequena','cat-velas-aromaticas'),
  ('product-chata','cat-velas-aromaticas'),
  ('product-gnomo','cat-velas-aromaticas'),
  ('product-carinito','cat-velas-aromaticas'),
  ('product-antojitos','cat-velas-aromaticas'),
  ('product-foforro','cat-velas-aromaticas'),
  ('product-calderito','cat-velas-aromaticas'),
  ('product-happy','cat-wax-melts'),
  ('product-halloween','cat-wax-melts'),
  ('product-kit-brujas','cat-kits'),
  ('product-kit-navidad','cat-kits');
