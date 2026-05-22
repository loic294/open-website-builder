import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

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
      content: Array.isArray(page?.content) ? page.content : [],
    };

    await writeFile(filePath, toJsonString(pageConfig));
    return pageConfig;
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
      const config = await readJsonFile(configPath);

      collections.push({
        id: config?.id || entry.name,
        title: config?.title || entry.name,
        requiredFields: buildCollectionRequiredFields(config?.fields),
      });
    }

    return collections;
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
      const config = await readJsonFile(configPath);
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

    const itemPayload = { id: itemId, ...item };
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
    return await readJsonFile(componentPath);
  }

  async function saveComponentConfig(componentId, componentConfig) {
    const normalizedComponentId = sanitizeId(componentId);
    const componentPath = await resolveSharedComponentFilePath(componentId);
    await writeFile(componentPath, toJsonString(componentConfig));
    return { ok: true, id: normalizedComponentId };
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
      content: Array.isArray(component?.content) ? component.content : [],
      ...component,
    };

    await writeFile(componentPath, toJsonString(componentPayload));
    return componentPayload;
  }

  return {
    listPages,
    getPageConfig,
    savePageConfig,
    createPage,
    listCollections,
    getAllCollectionsContent,
    getCollectionItemContent,
    addCollectionItem,
    updateCollectionItem,
    listSharedComponents,
    getComponentConfig,
    saveComponentConfig,
    createComponentConfig,
  };
}
