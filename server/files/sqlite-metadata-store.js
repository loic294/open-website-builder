function parse(row) {
  return row ? JSON.parse(row.document) : null;
}

export function createSqliteMetadataStore({ database }) {
  const select = database.prepare(
    "SELECT document FROM image_metadata WHERE folder_id = ? AND basename = ?",
  );
  const save = database.prepare(`
    INSERT INTO image_metadata (folder_id, basename, document)
    VALUES (?, ?, ?)
    ON CONFLICT(folder_id, basename) DO UPDATE SET document = excluded.document
  `);

  return {
    async saveMetadata(folderId, basename, data) {
      save.run(folderId, basename, JSON.stringify(data));
    },

    async getMetadata(folderId, basename) {
      return parse(select.get(folderId, basename));
    },

    async listMetadata(folderId = null) {
      const rows = folderId
        ? database
            .prepare(
              "SELECT document FROM image_metadata WHERE folder_id = ? ORDER BY basename",
            )
            .all(folderId)
        : database
            .prepare(
              "SELECT document FROM image_metadata ORDER BY folder_id, basename",
            )
            .all();
      return rows.map(parse);
    },

    async deleteMetadata(folderId, basename) {
      database
        .prepare(
          "DELETE FROM image_metadata WHERE folder_id = ? AND basename = ?",
        )
        .run(folderId, basename);
    },

    async renameMetadata(oldFolderId, oldBasename, newFolderId, newBasename) {
      const existing = parse(select.get(oldFolderId, oldBasename));
      if (!existing) return;
      const next = {
        ...existing,
        folderId: newFolderId,
        basename: newBasename,
      };
      database.exec("BEGIN IMMEDIATE");
      try {
        save.run(newFolderId, newBasename, JSON.stringify(next));
        database
          .prepare(
            "DELETE FROM image_metadata WHERE folder_id = ? AND basename = ?",
          )
          .run(oldFolderId, oldBasename);
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },

    async updateDescription(folderId, basename, description) {
      const existing = parse(select.get(folderId, basename));
      if (!existing) throw new Error("Metadata not found");
      save.run(
        folderId,
        basename,
        JSON.stringify({ ...existing, description }),
      );
    },

    async updatePlaceOverride(folderId, basename, override) {
      const existing = parse(select.get(folderId, basename));
      if (!existing) throw new Error("Metadata not found");
      const updated = {
        ...existing,
        place: { detected: existing.place?.detected || null, override },
      };
      save.run(folderId, basename, JSON.stringify(updated));
      return updated;
    },
  };
}
