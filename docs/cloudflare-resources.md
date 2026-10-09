# Cloudflare V2 resources (not deployed)

Configuration on the feature branch:
- D1 binding: `DB` → `chusquisimas-v2-db`
- R2 binding: `PRODUCT_IMAGES` → `chusquisimas-v2-images` (private)
- No DNS or production route changes.
- These bindings **do not create tables, seed data, or configure admin authentication**.

## Before running migrations

1. Ensure the correct Cloudflare account, worker, database ID, and R2 bucket have been selected.
2. Run `npx wrangler types --env-interface CloudflareEnv ./cloudflare-env.d.ts` from `v2/` and review the generated CloudflareEnv type changes.
3. Test migrations in an isolated *local* D1 instance first, in order:
   - `npx wrangler d1 migrations apply chusquisimas-v2-db --local`
   - `npx wrangler d1 execute chusquisimas-v2-db --local --file=./seeds/initial_catalog.sql`
4. For any remote D1 changes, verify backups and explicitly approve the exact account/database first. Remote migration execution is intentionally **not** automated by this change.

## Administration security prerequisites

- Enforce verified authentication (e.g. Cloudflare Access JWT validation) on **all** admin routes and write endpoints.
- Match the authenticated identity against an active `admin_users` record in D1.
- Enforce granular permissions on the server, never only in UI.
- Add transactions/audit records to every inventory and price edit.
- Use R2 only through authorized server endpoints; keep bucket private.
- Do not deploy or expose an admin UI or create privileged users until end-to-end tests pass.
