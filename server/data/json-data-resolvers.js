import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, resolve } from "node:path";

function toJsonString(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJsonFile(filePath) {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function listJsonFileNames(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);
}

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

async function ensurePathDoesNotExist(filePath, message) {
  try {
    await stat(filePath);
    throw new Error(message);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

function toFileId(fileName) {
  return fileName.replace(/\.json$/i, "");
}

function sanitizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildCollectionRequiredFields(fields = {}) {
  return Object.entries(fields)
    .filter(([, fieldConfig]) => Boolean(fieldConfig?.required))
    .map(([fieldName]) => fieldName);
}

function isCollectionConfigFile(fileName) {
  return fileName === "_config.json";
}

function getDefaultCollectionTemplate() {
  return [
    {
      id: "section-collection-template",
      type: "section",
      content: [],
      settings: {},
    },
  ];
}

function getDefaultSectionContent(sectionId = "section-default") {
  return [
    {
      id: sectionId,
      type: "section",
      content: [],
      settings: {},
    },
  ];
}

export function createJsonDataResolvers({ contentRoot }) {
  const pagesDir = resolve(contentRoot, "pages");
  const collectionsDir = resolve(contentRoot, "collections");
  const sharedDir = resolve(contentRoot, "shared");

  async function resolveSharedComponentFilePath(componentId) {
    const normalizedComponentId = sanitizeId(componentId);
    if (!normalizedComponentId) {
      throw new Error("Component id is required");
    }

    const componentFiles = await listJsonFileNames(sharedDir);
    for (const fileName of componentFiles) {
      const filePath = resolve(sharedDir, fileName);
      const componentConfig = await readJsonFile(filePath);
      if (sanitizeId(componentConfig?.id) === normalizedComponentId) {
        return filePath;
      }
    }

    const directPath = resolve(sharedDir, `${normalizedComponentId}.json`);
    try {
      await readFile(directPath, "utf8");
      return directPath;
    } catch {
      // Keep the fallback to preserve compatibility with files missing an id.
    }

    throw new Error(`Component not found: ${componentId}`);
  }

  async function resolvePageFilePath(pageId) {
    const normalizedPageId = sanitizeId(pageId);
    if (!normalizedPageId) {
      throw new Error("Page id is required");
    }

    const directPath = resolve(pagesDir, `${normalizedPageId}.json`);
    try {
      await readFile(directPath, "utf8");
      return directPath;
    } catch {
      const pageFiles = await listJsonFileNames(pagesDir);
      for (const fileName of pageFiles) {
        const filePath = resolve(pagesDir, fileName);
        const pageConfig = await readJsonFile(filePath);
        if (sanitizeId(pageConfig?.id) === normalizedPageId) {
          return filePath;
        }
      }
    }

    throw new Error(`Page not found: ${pageId}`);
  }

  async function listPages() {
    const pageFiles = await listJsonFileNames(pagesDir);
    const pages = [];

    for (const fileName of pageFiles) {
      const filePath = resolve(pagesDir, fileName);
      const pageConfig = await readJsonFile(filePath);
      pages.push({
        id: pageConfig?.id || toFileId(fileName),
        url: pageConfig?.url || "/",
        title: pageConfig?.title || "Untitled",
      });
    }

    return pages;
  }

  async function getPageConfig(pageId) {
    const filePath = await resolvePageFilePath(pageId);
    return await readJsonFile(filePath);
  }

  async function savePageConfig(pageId, pageConfig) {
    const filePath = await resolvePageFilePath(pageId);
    await writeFile(filePath, toJsonString(pageConfig));
    return { ok: true, id: pageId };
  }

  async function updatePageIdentity(pageId, identity) {
    const currentPath = await resolvePageFilePath(pageId);
    const currentConfig = await readJsonFile(currentPath);
    const nextId = sanitizeId(identity?.id);
    if (!nextId) {
      throw new Error("Page id is required");
    }

    const nextPath = resolve(pagesDir, `${nextId}.json`);
    if (nextPath !== currentPath) {
      await ensurePathDoesNotExist(nextPath, `Page already exists: ${nextId}`);
    }

    await writeFile(nextPath, toJsonString({ ...currentConfig, id: nextId }));
    if (nextPath !== currentPath) {
      await rm(currentPath);
    }

    return { ok: true, id: nextId, fileName: `${nextId}.json` };
  }

  async function createPage(page) {
    const requestedId = sanitizeId(page?.id || page?.title);
    if (!requestedId) {
      throw new Error("Page id or title is required to create a page");
    }

    const filePath = resolve(pagesDir, `${requestedId}.json`);

    try {
      await readFile(filePath, "utf8");
      throw new Error(`Page already exists: ${requestedId}`);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("ENOENT")) {
        throw error;
      }
    }

    const pageConfig = {
      type: "page",
      id: requestedId,
      title: page?.title || "Untitled",
      url: page?.url || `/${requestedId}`,
      seo: {
        title: String(page?.seo?.title || page?.title || "Untitled"),
        description: String(page?.seo?.description || ""),
        image: String(page?.seo?.image || ""),
        canonicalUrl: String(page?.seo?.canonicalUrl || ""),
        noIndex: Boolean(page?.seo?.noIndex),
      },
      content:
        Array.isArray(page?.content) && page.content.length > 0
          ? page.content
          : getDefaultSectionContent("section-page-default"),
    };

    await writeFile(filePath, toJsonString(pageConfig));
    return pageConfig;
  }

  async function deletePage(pageId) {
    const filePath = await resolvePageFilePath(pageId);
    await rm(filePath);
    return { ok: true, id: sanitizeId(pageId) };
  }

  async function listCollections() {
    const entries = await readdir(collectionsDir, { withFileTypes: true });
    const collections = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const collectionDir = resolve(collectionsDir, entry.name);
      const configPath = resolve(collectionDir, "_config.json");
      let config;
      try {
        config = await readJsonFile(configPath);
      } catch {
        // Ignore malformed collection directories so one bad folder does not
        // break the whole sidebar collections list.
        continue;
      }

      collections.push({
        id: config?.id || entry.name,
        title: config?.title || entry.name,
        requiredFields: buildCollectionRequiredFields(config?.fields),
      });
    }

    return collections;
  }

  async function createCollection(collection) {
    const collectionId = sanitizeId(collection?.id || collection?.title);
    if (!collectionId) {
      throw new Error("Collection id or title is required");
    }

    const collectionPath = resolve(collectionsDir, collectionId);
    await ensureDir(collectionPath);

    const configPath = resolve(collectionPath, "_config.json");
    try {
      await readFile(configPath, "utf8");
      throw new Error(`Collection already exists: ${collectionId}`);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("ENOENT")) {
        throw error;
      }
    }

    const config = {
      id: collectionId,
      title: String(collection?.title || collectionId).trim() || collectionId,
      fields: {
        title: { type: "string", required: true },
        content: { type: "array", required: true },
        metadata: { type: "object", required: false },
        seo: { type: "object", required: false },
      },
      content: getDefaultCollectionTemplate(),
      collectionMetadataAllowlist: [],
    };

    await writeFile(configPath, toJsonString(config));
    return config;
  }

  async function deleteCollection(collectionId) {
    const normalizedCollectionId = sanitizeId(collectionId);
    if (!normalizedCollectionId) {
      throw new Error("Collection id is required");
    }

    const collectionPath = resolve(collectionsDir, normalizedCollectionId);
    await rm(collectionPath, { recursive: true, force: false });
    return { ok: true, id: normalizedCollectionId };
  }

  async function getAllCollectionsContent() {
    const entries = await readdir(collectionsDir, { withFileTypes: true });
    const data = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const collectionDir = resolve(collectionsDir, entry.name);
      const configPath = resolve(collectionDir, "_config.json");
      let config;
      try {
        config = await readJsonFile(configPath);
      } catch {
        // Ignore malformed collection directories so one bad folder does not
        // break all collection content loading.
        continue;
      }
      const itemFiles = await listJsonFileNames(collectionDir);
      const items = [];

      for (const itemFile of itemFiles) {
        if (itemFile === "_config.json") {
          continue;
        }

        const itemPath = resolve(collectionDir, itemFile);
        const item = await readJsonFile(itemPath);
        items.push({
          id: item.id || toFileId(itemFile),
          ...item,
        });
      }

      data.push({
        collectionId: config?.id || entry.name,
        title: config?.title || entry.name,
        items,
      });
    }

    return data;
  }

  async function getGroupedCollectionsContent() {
    const entries = await readdir(collectionsDir, { withFileTypes: true });
    const groups = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const collectionDir = resolve(collectionsDir, entry.name);
      const configPath = resolve(collectionDir, "_config.json");
      let config;
      try {
        config = await readJsonFile(configPath);
      } catch {
        continue;
      }

      const itemFiles = await listJsonFileNames(collectionDir);
      const items = [];
      for (const itemFile of itemFiles) {
        if (isCollectionConfigFile(itemFile)) {
          continue;
        }

        const itemPath = resolve(collectionDir, itemFile);
        const item = await readJsonFile(itemPath);
        items.push({
          id: item?.id || toFileId(itemFile),
          title: item?.title || item?.id || toFileId(itemFile),
        });
      }

      groups.push({
        collectionId: config?.id || entry.name,
        title: config?.title || entry.name,
        items,
        configItem: {
          id: "_config",
          title: "_config.json",
        },
      });
    }

    return groups;
  }

  async function getCollectionConfig(collectionId) {
    const normalizedCollectionId = sanitizeId(collectionId);
    const configPath = resolve(
      collectionsDir,
      normalizedCollectionId,
      "_config.json",
    );
    const config = await readJsonFile(configPath);
    const hasTemplateContent =
      Array.isArray(config?.content) && config.content.length > 0;

    if (hasTemplateContent) {
      return config;
    }

    const nextConfig = {
      ...(config && typeof config === "object" ? config : {}),
      content: getDefaultCollectionTemplate(),
    };

    await writeFile(configPath, toJsonString(nextConfig));
    return nextConfig;
  }

  async function saveCollectionConfig(collectionId, config) {
    const normalizedCollectionId = sanitizeId(collectionId);
    const configPath = resolve(
      collectionsDir,
      normalizedCollectionId,
      "_config.json",
    );
    await writeFile(configPath, toJsonString(config));
    return { ok: true, id: normalizedCollectionId };
  }

  async function updateCollectionIdentity(collectionId, identity) {
    const currentId = sanitizeId(collectionId);
    const nextId = sanitizeId(identity?.id);
    if (!currentId || !nextId) {
      throw new Error("Collection id is required");
    }

    const currentPath = resolve(collectionsDir, currentId);
    const nextPath = resolve(collectionsDir, nextId);
    const currentConfig = await readJsonFile(
      resolve(currentPath, "_config.json"),
    );

    if (nextPath !== currentPath) {
      await ensurePathDoesNotExist(
        nextPath,
        `Collection already exists: ${nextId}`,
      );
      await rename(currentPath, nextPath);
    }

    await writeFile(
      resolve(nextPath, "_config.json"),
      toJsonString({ ...currentConfig, id: nextId }),
    );

    return { ok: true, id: nextId };
  }

  async function getCollectionItemContent(collectionId, itemId) {
    const normalizedCollectionId = sanitizeId(collectionId);
    const normalizedItemId = sanitizeId(itemId);

    const itemPath = resolve(
      collectionsDir,
      normalizedCollectionId,
      `${normalizedItemId}.json`,
    );

    return await readJsonFile(itemPath);
  }

  async function getCollectionItemsMetadata(collectionId) {
    const normalizedCollectionId = sanitizeId(collectionId);
    const collectionPath = resolve(collectionsDir, normalizedCollectionId);
    const itemFiles = await listJsonFileNames(collectionPath);
    const items = [];

    for (const itemFile of itemFiles) {
      if (isCollectionConfigFile(itemFile)) {
        continue;
      }

      const itemPath = resolve(collectionPath, itemFile);
      const item = await readJsonFile(itemPath);

      const itemId = item?.id || toFileId(itemFile);
      const rawUrl =
        item?.url ||
        item?.metadata?.url ||
        item?.metadata?.sourceUrl ||
        `/${normalizedCollectionId}/${itemId}`;
      const computedUrl = String(rawUrl || "")
        .split("?")[0]
        .split("#")[0]
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");
      const metadata = { ...(item && typeof item === "object" ? item : {}) };
      delete metadata.content;
      metadata.url = computedUrl;

      items.push({
        id: itemId,
        title: item?.title || itemId,
        metadata,
      });
    }

    return {
      collectionId: normalizedCollectionId,
      items,
    };
  }

  async function addCollectionItem(collectionId, item) {
    const normalizedCollectionId = sanitizeId(collectionId);
    const itemId = sanitizeId(item?.id || item?.title || `item-${Date.now()}`);
    if (!itemId) {
      throw new Error("Collection item id is required");
    }

    const collectionPath = resolve(collectionsDir, normalizedCollectionId);
    const itemPath = resolve(collectionPath, `${itemId}.json`);

    try {
      await readFile(itemPath, "utf8");
      throw new Error(`Collection item already exists: ${itemId}`);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("ENOENT")) {
        throw error;
      }
    }

    const itemPayload = {
      id: itemId,
      ...item,
      seo: {
        title: String(item?.seo?.title || item?.title || itemId),
        description: String(item?.seo?.description || item?.excerpt || ""),
        image: String(item?.seo?.image || ""),
        canonicalUrl: String(item?.seo?.canonicalUrl || ""),
        noIndex: Boolean(item?.seo?.noIndex),
      },
      content:
        Array.isArray(item?.content) && item.content.length > 0
          ? item.content
          : getDefaultSectionContent("section-collection-item-default"),
    };
    await writeFile(itemPath, toJsonString(itemPayload));
    return itemPayload;
  }

  async function updateCollectionItem(collectionId, itemId, item) {
    const normalizedCollectionId = sanitizeId(collectionId);
    const normalizedItemId = sanitizeId(itemId);
    const itemPath = resolve(
      collectionsDir,
      normalizedCollectionId,
      `${normalizedItemId}.json`,
    );

    const itemPayload = { id: normalizedItemId, ...item };
    await writeFile(itemPath, toJsonString(itemPayload));
    return itemPayload;
  }

  async function updateCollectionItemIdentity(collectionId, itemId, identity) {
    const normalizedCollectionId = sanitizeId(collectionId);
    const currentItemId = sanitizeId(itemId);
    const nextId = sanitizeId(identity?.id);
    if (!normalizedCollectionId || !currentItemId || !nextId) {
      throw new Error("Collection id and item id are required");
    }

    const collectionPath = resolve(collectionsDir, normalizedCollectionId);
    const currentPath = resolve(collectionPath, `${currentItemId}.json`);
    const nextPath = resolve(collectionPath, `${nextId}.json`);
    const currentItem = await readJsonFile(currentPath);

    if (nextPath !== currentPath) {
      await ensurePathDoesNotExist(
        nextPath,
        `Collection item already exists: ${nextId}`,
      );
    }

    const nextItem = { ...currentItem, id: nextId };
    await writeFile(nextPath, toJsonString(nextItem));
    if (nextPath !== currentPath) {
      await rm(currentPath);
    }

    return { ...nextItem, fileName: `${nextId}.json` };
  }

  async function deleteCollectionItem(collectionId, itemId) {
    const normalizedCollectionId = sanitizeId(collectionId);
    const normalizedItemId = sanitizeId(itemId);
    if (!normalizedCollectionId || !normalizedItemId) {
      throw new Error("Collection id and item id are required");
    }

    const itemPath = resolve(
      collectionsDir,
      normalizedCollectionId,
      `${normalizedItemId}.json`,
    );

    await rm(itemPath);
    return { ok: true, id: normalizedItemId };
  }

  async function listSharedComponents() {
    const componentFiles = await listJsonFileNames(sharedDir);
    const components = [];

    for (const fileName of componentFiles) {
      const filePath = resolve(sharedDir, fileName);
      const config = await readJsonFile(filePath);
      components.push({
        id: config?.id || toFileId(fileName),
        title: config?.title || config?.id || toFileId(fileName),
      });
    }

    return components;
  }

  async function getComponentConfig(componentId) {
    const componentPath = await resolveSharedComponentFilePath(componentId);
    return {
      ...(await readJsonFile(componentPath)),
      __fileName: basename(componentPath),
    };
  }

  async function saveComponentConfig(componentId, componentConfig) {
    const normalizedComponentId = sanitizeId(componentId);
    const componentPath = await resolveSharedComponentFilePath(componentId);
    const nextConfig = {
      ...(componentConfig && typeof componentConfig === "object"
        ? componentConfig
        : {}),
    };
    delete nextConfig.__fileName;
    await writeFile(componentPath, toJsonString(nextConfig));
    return { ok: true, id: normalizedComponentId };
  }

  async function updateComponentIdentity(componentId, identity) {
    const componentPath = await resolveSharedComponentFilePath(componentId);
    const currentConfig = await readJsonFile(componentPath);

    const normalizedId = sanitizeId(
      identity?.id || currentConfig?.id || componentId,
    );
    if (!normalizedId) {
      throw new Error("Shared component id is required");
    }

    const nextTitle =
      String(identity?.title || currentConfig?.title || normalizedId).trim() ||
      normalizedId;

    const requestedFileStem = sanitizeId(
      String(identity?.fileName || "")
        .trim()
        .replace(/\.json$/i, ""),
    );
    const nextFileStem = requestedFileStem || normalizedId;
    const nextFileName = `${nextFileStem}.json`;
    const nextComponentPath = resolve(sharedDir, nextFileName);

    if (nextComponentPath !== componentPath) {
      try {
        await readFile(nextComponentPath, "utf8");
        throw new Error(
          `Shared component file already exists: ${nextFileName}`,
        );
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("ENOENT")) {
          throw error;
        }
      }
    }

    const nextConfig = {
      ...(currentConfig && typeof currentConfig === "object"
        ? currentConfig
        : {}),
      id: normalizedId,
      title: nextTitle,
    };

    await writeFile(nextComponentPath, toJsonString(nextConfig));
    if (nextComponentPath !== componentPath) {
      await rm(componentPath);
    }

    return {
      ok: true,
      id: normalizedId,
      title: nextTitle,
      fileName: nextFileName,
    };
  }

  async function createComponentConfig(component) {
    const componentId = sanitizeId(component?.id || component?.title);
    if (!componentId) {
      throw new Error("Component id or title is required");
    }

    const componentPath = resolve(sharedDir, `${componentId}.json`);

    try {
      await readFile(componentPath, "utf8");
      throw new Error(`Component already exists: ${componentId}`);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("ENOENT")) {
        throw error;
      }
    }

    const componentPayload = {
      type: "shared-component",
      id: componentId,
      ...component,
      content:
        Array.isArray(component?.content) && component.content.length > 0
          ? component.content
          : getDefaultSectionContent("section-shared-default"),
    };

    await writeFile(componentPath, toJsonString(componentPayload));
    return componentPayload;
  }

  async function deleteComponentConfig(componentId) {
    const normalizedComponentId = sanitizeId(componentId);
    if (!normalizedComponentId) {
      throw new Error("Component id is required");
    }

    const componentPath = await resolveSharedComponentFilePath(componentId);
    await rm(componentPath);
    return { ok: true, id: normalizedComponentId };
  }

  async function listImageFiles(directoryPath) {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    try {
      const entries = await readdir(directoryPath, { withFileTypes: true });
      const imageFiles = entries
        .filter((entry) => {
          if (!entry.isFile()) {
            return false;
          }
          const ext = entry.name
            .toLowerCase()
            .slice(entry.name.lastIndexOf("."));
          return imageExtensions.includes(ext);
        })
        .map((entry) => entry.name);
      return imageFiles;
    } catch {
      return [];
    }
  }

  async function getImageUrls(imagePath) {
    // Normalize the path (remove leading/trailing slashes, prevent directory traversal)
    const normalizedPath = String(imagePath || "")
      .split("/")
      .filter(Boolean)
      .join("/");

    if (!normalizedPath) {
      throw new Error("Image path is required");
    }

    // Resolve the path within the content root
    const imageDir = resolve(contentRoot, normalizedPath);

    // Prevent directory traversal attacks
    if (!imageDir.startsWith(contentRoot)) {
      throw new Error("Invalid image path");
    }

    const imageFiles = await listImageFiles(imageDir);
    const urls = imageFiles.map((fileName) => `/${normalizedPath}/${fileName}`);

    return { urls };
  }

  return {
    listPages,
    getPageConfig,
    savePageConfig,
    updatePageIdentity,
    createPage,
    deletePage,
    listCollections,
    createCollection,
    deleteCollection,
    getAllCollectionsContent,
    getGroupedCollectionsContent,
    getCollectionConfig,
    saveCollectionConfig,
    updateCollectionIdentity,
    getCollectionItemContent,
    getCollectionItemsMetadata,
    addCollectionItem,
    updateCollectionItem,
    updateCollectionItemIdentity,
    deleteCollectionItem,
    listSharedComponents,
    getComponentConfig,
    saveComponentConfig,
    updateComponentIdentity,
    createComponentConfig,
    deleteComponentConfig,
    getImageUrls,
  };
}
