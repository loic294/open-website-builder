function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parse(row) {
  return row ? JSON.parse(row.document) : null;
}

export function createSqliteFoldersStore({ database }) {
  const select = database.prepare(
    "SELECT document FROM image_folders WHERE id = ?",
  );
  const insert = database.prepare(
    "INSERT INTO image_folders (id, document) VALUES (?, ?)",
  );

  return {
    async listFolders() {
      return database
        .prepare("SELECT document FROM image_folders ORDER BY id")
        .all()
        .map(parse);
    },

    async createFolder(name) {
      const base = slugify(name) || String(name || "").slice(0, 32);
      let id = base;
      let suffix = 2;
      while (select.get(id)) id = `${base}-${suffix++}`;
      const folder = { id, name };
      insert.run(id, JSON.stringify(folder));
      return folder;
    },

    async importFolder(id, name) {
      const existing = parse(select.get(id));
      if (existing) return existing;
      const folder = { id, name };
      insert.run(id, JSON.stringify(folder));
      return folder;
    },

    async renameFolder(id, name) {
      const existing = parse(select.get(id));
      if (!existing) throw new Error(`Folder not found: ${id}`);
      const folder = { ...existing, name };
      database
        .prepare("UPDATE image_folders SET document = ? WHERE id = ?")
        .run(JSON.stringify(folder), id);
      return folder;
    },

    async deleteFolder(id) {
      database.prepare("DELETE FROM image_folders WHERE id = ?").run(id);
    },

    async getFolder(id) {
      return parse(select.get(id));
    },
  };
}
