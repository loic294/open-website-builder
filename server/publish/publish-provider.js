import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";

function toBaseName(fileName) {
  return String(fileName || "").replace(/\.json$/i, "");
}

async function readJson(filePath) {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
}

export async function copyDirectoryRecursive(sourceDir, targetDir) {
  let sourceStats;
  try {
    sourceStats = await stat(sourceDir);
  } catch {
    return;
  }

  if (!sourceStats.isDirectory()) {
    return;
  }

  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = resolve(sourceDir, entry.name);
    const targetPath = resolve(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectoryRecursive(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      await copyFile(sourcePath, targetPath);
    }
  }
}

export function createFilesystemPublishProvider({
  contentRoot,
  pagesRoot,
  collectionsRoot,
  sharedRoot,
  imagesRoot,
  publicRoot,
}) {
  const pagesDir = pagesRoot || resolve(contentRoot, "pages");
  const sharedDir = sharedRoot || resolve(contentRoot, "shared");
  const collectionsDir = collectionsRoot || resolve(contentRoot, "collections");
  const resolvedImagesRoot = imagesRoot || resolve(contentRoot, "images");
  const resolvedPublicRoot = publicRoot || resolve(contentRoot, "public");
  const siteConfigPath = resolve(contentRoot, "config.json");

  return {
    async getSiteConfig() {
      try {
        return await readJson(siteConfigPath);
      } catch {
        return {};
      }
    },

    async listPageIds() {
      try {
        const pageFiles = await readdir(pagesDir, { withFileTypes: true });
        return pageFiles
          .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
          .map((entry) => toBaseName(entry.name))
          .sort((a, b) => a.localeCompare(b));
      } catch {
        return [];
      }
    },

    async getPageConfig(pageId) {
      return await readJson(resolve(pagesDir, `${pageId}.json`));
    },

    async getSharedComponent(componentId) {
      try {
        return await readJson(resolve(sharedDir, `${componentId}.json`));
      } catch {
        return null;
      }
    },

    async listCollectionIds() {
      try {
        const entries = await readdir(collectionsDir, { withFileTypes: true });
        return entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort((a, b) => a.localeCompare(b));
      } catch {
        return [];
      }
    },

    async getCollectionConfig(collectionId) {
      try {
        return await readJson(
          resolve(collectionsDir, collectionId, "_config.json"),
        );
      } catch {
        return null;
      }
    },

    async listCollectionItemsMetadata(collectionId) {
      let itemEntries = [];
      try {
        itemEntries = await readdir(resolve(collectionsDir, collectionId), {
          withFileTypes: true,
        });
      } catch {
        return { collectionId, items: [] };
      }

      const jsonItemFiles = itemEntries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .filter((entry) => entry.name !== "_config.json")
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));

      const items = [];
      for (const fileName of jsonItemFiles) {
        try {
          const item = await readJson(
            resolve(collectionsDir, collectionId, fileName),
          );
          const metadata = {
            ...(item && typeof item === "object" ? item : {}),
          };
          delete metadata.content;
          const fileBaseName = toBaseName(fileName);
          const itemId = String(item?.id || fileBaseName);
          items.push({
            id: itemId,
            fileBaseName,
            title: item?.title || itemId,
            metadata,
          });
        } catch {
          // Ignore malformed items so one broken file does not stop publishing.
        }
      }

      return { collectionId, items };
    },

    async getCollectionItemConfig(collectionId, fileBaseName) {
      return await readJson(
        resolve(collectionsDir, collectionId, `${fileBaseName}.json`),
      );
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
