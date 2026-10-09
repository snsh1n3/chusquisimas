-- Chusquisimas V2: esquema inicial de administración y auditoría.
-- No incluye usuarios reales ni credenciales.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_permissions (
  key TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_id TEXT NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES admin_permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','active','suspended')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_user_roles (
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES admin_roles(id) ON DELETE RESTRICT,
  PRIMARY KEY(user_id,role_id)
);

CREATE TABLE IF NOT EXISTS admin_user_permission_overrides (
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES admin_permissions(key) ON DELETE CASCADE,
  allowed INTEGER NOT NULL CHECK(allowed IN (0, 1)),
  PRIMARY KEY(user_id,permission_key)
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_resource
  ON admin_audit_log(resource_type, resource_id, created_at);

INSERT OR IGNORE INTO admin_roles(id,name,is_system) VALUES
  ('administrator','Administrador',1),
  ('manager','Gestor',1),
  ('inventory','Inventario',1),
  ('viewer','Consulta',1);

INSERT OR IGNORE INTO admin_permissions(key,description) VALUES
  ('catalog.read','Consultar catálogo'),
  ('catalog.write','Editar productos y precios'),
  ('inventory.write','Editar existencias'),
  ('media.write','Administrar fotografías'),
  ('audit.read','Consultar auditoría'),
  ('users.manage','Administrar usuarios'),
  ('permissions.manage','Modificar roles y permisos');

INSERT OR IGNORE INTO admin_role_permissions(role_id,permission_key)
  SELECT 'administrator', key FROM admin_permissions;

INSERT OR IGNORE INTO admin_role_permissions(role_id,permission_key) VALUES
  ('manager','catalog.read'),('manager','catalog.write'),
  ('manager','inventory.write'),('manager','media.write'),
  ('manager','audit.read'),
  ('inventory','catalog.read'),('inventory','inventory.write'),
  ('inventory','audit.read'),
  ('viewer','catalog.read'),('viewer','audit.read');
