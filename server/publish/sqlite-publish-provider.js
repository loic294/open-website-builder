import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { copyDirectoryRecursive } from "./publish-provider.js";

function parse(row) {
  return row ? JSON.parse(row.document) : null;
}

export function createSqlitePublishProvider({
  database,
  contentRoot,
  imagesRoot,
  publicRoot,
}) {
  const resolvedImagesRoot = imagesRoot || resolve(contentRoot, "images");
  const resolvedPublicRoot = publicRoot || resolve(contentRoot, "public");

  return {
    async getSiteConfig() {
      try {
        return JSON.parse(
          await readFile(resolve(contentRoot, "config.json"), "utf8"),
        );
      } catch {
        return {};
      }
    },

    async listPageIds() {
      return database
        .prepare("SELECT id FROM pages ORDER BY id")
        .all()
        .map(({ id }) => id);
    },

    async getPageConfig(pageId) {
      const page = parse(
        database.prepare("SELECT document FROM pages WHERE id = ?").get(pageId),
      );
      if (!page) throw new Error(`Page not found: ${pageId}`);
      return page;
    },

    async getSharedComponent(componentId) {
      return parse(
        database
          .prepare("SELECT document FROM shared_components WHERE id = ?")
          .get(componentId),
      );
    },

    async listCollectionIds() {
      return database
        .prepare("SELECT id FROM collections ORDER BY id")
        .all()
        .map(({ id }) => id);
    },

    async getCollectionConfig(collectionId) {
      return parse(
        database
          .prepare("SELECT document FROM collections WHERE id = ?")
          .get(collectionId),
      );
    },

    async listCollectionItemsMetadata(collectionId) {
      const items = database
        .prepare(
          "SELECT id, document FROM collection_items WHERE collection_id = ? ORDER BY id",
        )
        .all(collectionId)
        .map((row) => {
          const item = parse(row);
          const metadata = { ...item };
          delete metadata.content;
          return {
            id: item.id || row.id,
            fileBaseName: row.id,
            title: item.title || item.id || row.id,
            metadata,
          };
        });
      return { collectionId, items };
    },

    async getCollectionItemConfig(collectionId, itemId) {
      const item = parse(
        database
          .prepare(
            "SELECT document FROM collection_items WHERE collection_id = ? AND id = ?",
          )
          .get(collectionId, itemId),
      );
      if (!item) {
        throw new Error(`Collection item not found: ${collectionId}/${itemId}`);
      }
      return item;
    },

    async copyImagesTo(outputDir) {
      await copyDirectoryRecursive(
        resolvedImagesRoot,
        resolve(outputDir, "images"),
      );
    },

    async copyPublicTo(outputDir) {
      await copyDirectoryRecursive(resolvedPublicRoot, outputDir);
    },
  };
}
