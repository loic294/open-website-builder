import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";

export function createMetadataStore({ contentRoot, imagesRoot }) {
  const metaRoot = resolve(imagesRoot || contentRoot, "_metadata");

  function metaFilePath(folderId, basename) {
    return resolve(metaRoot, folderId, `${basename}.json`);
  }

  return {
    async saveMetadata(folderId, basename, data) {
      const filePath = metaFilePath(folderId, basename);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
    },

    async getMetadata(folderId, basename) {
      try {
        const raw = await readFile(metaFilePath(folderId, basename), "utf8");
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },

    async listMetadata(folderId = null) {
      const { readdir } = await import("node:fs/promises");
      const results = [];

      const folders = folderId
        ? [folderId]
        : await readdir(metaRoot).catch(() => []);

      for (const folder of folders) {
        const folderPath = resolve(metaRoot, folder);
        let files;
        try {
          files = await readdir(folderPath);
        } catch {
          continue;
        }
        for (const file of files) {
          if (!file.endsWith(".json")) continue;
          try {
            const raw = await readFile(resolve(folderPath, file), "utf8");
            results.push(JSON.parse(raw));
          } catch {
            // skip corrupt metadata files
          }
        }
      }

      return results;
    },

    async deleteMetadata(folderId, basename) {
      const { unlink } = await import("node:fs/promises");
      try {
        await unlink(metaFilePath(folderId, basename));
      } catch {
        // ignore if already gone
      }
    },

    async renameMetadata(oldFolderId, oldBasename, newFolderId, newBasename) {
      const { rename } = await import("node:fs/promises");
      const oldPath = metaFilePath(oldFolderId, oldBasename);
      const newPath = metaFilePath(newFolderId, newBasename);
      await mkdir(dirname(newPath), { recursive: true });
      await rename(oldPath, newPath);
    },

    async updateDescription(folderId, basename, description) {
      const existing = await this.getMetadata(folderId, basename);
      if (!existing) throw new Error("Metadata not found");
      await this.saveMetadata(folderId, basename, { ...existing, description });
    },

    async updatePlaceOverride(folderId, basename, override) {
      const existing = await this.getMetadata(folderId, basename);
      if (!existing) throw new Error("Metadata not found");
      const place = {
        detected: existing.place?.detected || null,
        override,
      };
      const updated = { ...existing, place };
      await this.saveMetadata(folderId, basename, updated);
      return updated;
    },
  };
}
