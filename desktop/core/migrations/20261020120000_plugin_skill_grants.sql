-- The plugins copied from a folder or a zip whose skill the person allowed
-- to reach their agents. The official plugins' and the linked plugins'
-- skills always do. A grant goes with its installation, and an install
-- from another source revokes it.
CREATE TABLE plugin_skill_grants (
  name        TEXT PRIMARY KEY REFERENCES plugin_installs(name) ON DELETE CASCADE,
  granted_at  TEXT NOT NULL
);
