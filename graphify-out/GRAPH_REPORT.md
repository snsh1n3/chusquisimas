# Graph Report - v2  (2026-10-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 639 nodes · 1462 edges · 17 communities (13 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d1845e80`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ValidationError
- next
- catalog.ts
- admin/page.tsx
- with-api-logging.ts
- package.json
- headers.ts
- ref_node_assert
- manage/route.ts
- 0002_editable_catalog.sql
- compilerOptions
- order-panel.tsx
- csp-report.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `ValidationError` - 39 edges
2. `next` - 31 edges
3. `requireAuthenticatedAdmin()` - 21 edges
4. `withApiLogging()` - 20 edges
5. `compilerOptions` - 18 edges
6. `ConflictError` - 17 edges
7. `adminErrorResponse()` - 16 edges
8. `AdminHomePage()` - 15 edges
9. `createLogger()` - 14 edges
10. `servePublicImage()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `hasError()` --calls--> `validateProductVariant()`  [EXTRACTED]
  tests/catalog/validation.test.ts → src/lib/catalog/validation.ts
- `respond()` --calls--> `adminErrorResponse()`  [EXTRACTED]
  tests/admin/api-errors.test.ts → src/lib/admin/api-errors.ts
- `POST` --calls--> `ConflictError`  [EXTRACTED]
  src/app/api/admin/images/manage/route.ts → src/lib/observability/errors.ts
- `assertCurrentOrder()` --calls--> `ConflictError`  [EXTRACTED]
  src/lib/admin/image-order.ts → src/lib/observability/errors.ts
- `assertAllChanged()` --calls--> `ConflictError`  [EXTRACTED]
  src/lib/admin/image-service.ts → src/lib/observability/errors.ts

## Import Cycles
- None detected.

## Communities (17 total, 4 thin omitted)

### Community 0 - "ValidationError"
Cohesion: 0.05
Nodes (59): Bindings, dynamic, encodeWebp(), POST, dynamic, POST, dynamic, POST (+51 more)

### Community 1 - "next"
Cohesion: 0.05
Nodes (64): next, react, metadata, quicksand, metadata, NotFound(), categories, Home() (+56 more)

### Community 2 - "catalog.ts"
Cohesion: 0.05
Nodes (57): ProductCard(), ProductCardProps, catalogCategories, candleAromas, draftCatalogProducts, preparationDays, referenceNotes, references (+49 more)

### Community 3 - "admin/page.tsx"
Cohesion: 0.05
Nodes (48): AdminHomePage(), AdminVariantRow, dynamic, metadata, AddVariant(), InventoryEditor(), PriceEditor(), CreateProductForm() (+40 more)

### Community 4 - "with-api-logging.ts"
Cohesion: 0.07
Nodes (44): @opennextjs/cloudflare, dynamic, GET, notFound(), dynamic, GET, dynamic, GET (+36 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (41): dependencies, next, @opennextjs/cloudflare, react, react-dom, devDependencies, eslint, eslint-config-next (+33 more)

### Community 6 - "headers.ts"
Cohesion: 0.06
Nodes (28): nextConfig, full, [fullPath, prodPath], order, prod, prodBlocking, prodNames, rows (+20 more)

### Community 7 - "ref_node_assert"
Cohesion: 0.09
Nodes (26): AccessClaims, AccessJwk, AccessVerificationConfig, base64urlDecode(), clock(), decodeJson(), fetchKeys(), findSigningKey() (+18 more)

### Community 8 - "manage/route.ts"
Cohesion: 0.18
Nodes (19): dynamic, NO_STORE, POST, applyImageOrder(), assertCurrentOrder(), ImageOrderAction, isValidImageId(), parseExpectedOrder() (+11 more)

### Community 9 - "0002_editable_catalog.sql"
Cohesion: 0.18
Nodes (19): admin_audit_log, admin_permissions, admin_role_permissions, admin_roles, admin_user_permission_overrides, admin_user_roles, admin_users, idx_admin_audit_resource (+11 more)

### Community 10 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+12 more)

### Community 11 - "order-panel.tsx"
Cohesion: 0.24
Nodes (14): OrderPanel(), availabilityText(), buildProductOrderUrl(), clampQuantity(), isOrderable(), MAX_ORDER_QUANTITY, orderPresentation(), createOrderMessage() (+6 more)

### Community 13 - "csp-report.ts"
Cohesion: 0.22
Nodes (13): dynamic, NO_CONTENT(), POST, asText(), CSP_REPORT_CONTENT_TYPES, CspViolation, isRecord(), KEYWORD_SOURCES (+5 more)

## Knowledge Gaps
- **9 isolated node(s):** `@eslint/eslintrc`, `react-dom`, `tailwindcss`, `@tailwindcss/postcss`, `@types/node` (+4 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 244 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `ValidationError`, `catalog.ts`, `admin/page.tsx`, `with-api-logging.ts`, `package.json`, `headers.ts`, `manage/route.ts`, `csp-report.ts`?**
  _High betweenness centrality (0.202) - this node is a cross-community bridge._
- **What connects `@eslint/eslintrc`, `react-dom`, `tailwindcss` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ValidationError` be split into smaller, more focused modules?**
  _Cohesion score 0.053305879661404716 - nodes in this community are weakly interconnected._
- **Why does `@opennextjs/cloudflare` connect `with-api-logging.ts` to `ValidationError`, `next`, `admin/page.tsx`, `package.json`, `headers.ts`, `manage/route.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.05052125100240577 - nodes in this community are weakly interconnected._
- **Why does `ValidationError` connect `ValidationError` to `manage/route.ts`, `order-panel.tsx`, `with-api-logging.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `catalog.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05290490100616683 - nodes in this community are weakly interconnected._