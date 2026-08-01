import { createDataApiProvider } from "../data/data-api-provider.js";
import { createDataApiMiddleware } from "../data/data-api-middleware.js";
import { createFilesApiMiddleware } from "../files/files-api-middleware.js";
import { buildDefaultImagePaths } from "../files/image-paths.js";
import { publishSite } from "../publish/publish-site.js";
import { createNpmScriptService } from "../deployment/npm-script-service.js";
import { createDeploymentService } from "../deployment/deployment-service.js";
import { createDeploymentApiMiddleware } from "../deployment/deployment-api-middleware.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function requireUrl(url, label) {
  const value = String(url || "").trim();
  if (!value) throw new Error(`${label} url is required`);
  if (!value.startsWith("/") || value.startsWith("//") || /[?#]/.test(value)) {
    throw new Error(
      `${label} url must be a root-relative path without a query or fragment`,
    );
  }
  return value;
}

function createInMemoryObjectStore() {
  const blobs = new Map();

  function responseFor(key) {
    const entry = blobs.get(key);
    if (!entry) {
      return {
        ok: false,
        status: 404,
        headers: new Headers(),
        async arrayBuffer() {
          return new ArrayBuffer(0);
        },
      };
    }
    return {
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": entry.contentType }),
      async arrayBuffer() {
        return entry.buffer.buffer.slice(
          entry.buffer.byteOffset,
          entry.buffer.byteOffset + entry.buffer.byteLength,
        );
      },
    };
  }

  return {
    async listAllObjects(prefix = "") {
      const contents = [];
      for (const [key, entry] of blobs.entries()) {
        if (key.startsWith(prefix)) {
          contents.push({ key, size: entry.buffer.length });
        }
      }
      return { contents };
    },

    async getObject(key) {
      return responseFor(key);
    },

    async putObject(key, body, contentType = "application/octet-stream") {
      const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body || "");
      blobs.set(key, { buffer, contentType });
    },

    async deleteObject(key) {
      blobs.delete(key);
    },

    async deleteObjects(keys) {
      for (const key of keys) {
        blobs.delete(key);
      }
    },
  };
}

function createInMemoryMetadataStore() {
  const records = new Map();

  function key(folderId, basename) {
    return `${folderId}::${basename}`;
  }

  return {
    async saveMetadata(folderId, basename, data) {
      records.set(key(folderId, basename), clone(data));
    },

    async getMetadata(folderId, basename) {
      const value = records.get(key(folderId, basename));
      return value ? clone(value) : null;
    },

    async listMetadata(folderId = null) {
      const output = [];
      for (const value of records.values()) {
        if (!folderId || value.folderId === folderId) {
          output.push(clone(value));
        }
      }
      return output;
    },

    async deleteMetadata(folderId, basename) {
      records.delete(key(folderId, basename));
    },

    async renameMetadata(oldFolderId, oldBasename, newFolderId, newBasename) {
      const existing = records.get(key(oldFolderId, oldBasename));
      if (!existing) return;
      records.delete(key(oldFolderId, oldBasename));
      records.set(
        key(newFolderId, newBasename),
        clone({ ...existing, folderId: newFolderId, basename: newBasename }),
      );
    },

    async updateDescription(folderId, basename, description) {
      const existing = records.get(key(folderId, basename));
      if (!existing) throw new Error("Metadata not found");
      records.set(key(folderId, basename), {
        ...existing,
        description,
      });
    },

    async updatePlaceOverride(folderId, basename, override) {
      const existing = records.get(key(folderId, basename));
      if (!existing) throw new Error("Metadata not found");
      const updated = {
        ...existing,
        place: {
          detected: existing.place?.detected || null,
          override,
        },
      };
      records.set(key(folderId, basename), updated);
      return clone(updated);
    },
  };
}

function createInMemoryFoldersStore() {
  const folders = new Map([["root", { id: "root", name: "Root" }]]);

  return {
    async listFolders() {
      return [...folders.values()].map(clone);
    },

    async createFolder(name) {
      const base = normalizeId(name) || `folder-${Date.now()}`;
      let id = base;
      let n = 2;
      while (folders.has(id)) id = `${base}-${n++}`;
      const folder = { id, name: String(name || id) };
      folders.set(id, folder);
      return clone(folder);
    },

    async importFolder(id, name) {
      if (!folders.has(id)) {
        folders.set(id, { id, name: name || id });
      }
      return clone(folders.get(id));
    },

    async renameFolder(id, name) {
      const existing = folders.get(id);
      if (!existing) throw new Error(`Folder not found: ${id}`);
      existing.name = String(name || existing.name);
      folders.set(id, existing);
      return clone(existing);
    },

    async deleteFolder(id) {
      folders.delete(id);
    },

    async getFolder(id) {
      const folder = folders.get(id);
      return folder ? clone(folder) : null;
    },
  };
}

export function createInMemoryBackendProviders({ appRoot, siteConfig }) {
  const pages = new Map();
  const collections = new Map();
  const sharedComponents = new Map();
  const objectStore = createInMemoryObjectStore();
  const metadataStore = createInMemoryMetadataStore();
  const foldersStore = createInMemoryFoldersStore();

  async function listPages() {
    return [...pages.values()].map((page) => ({
      id: page.id,
      url: page.url,
      title: page.title || "Untitled",
    }));
  }

  async function getPageConfig(pageId) {
    const key = normalizeId(pageId);
    const page = pages.get(key);
    if (!page) throw new Error(`Page not found: ${pageId}`);
    return clone(page);
  }

  async function savePageConfig(pageId, pageConfig) {
    const key = normalizeId(pageId);
    requireUrl(pageConfig?.url, `Page '${pageId}'`);
    pages.set(key, clone({ ...pageConfig, id: pageConfig?.id || key }));
    return { ok: true, id: key };
  }

  async function updatePageIdentity(pageId, identity) {
    const currentId = normalizeId(pageId);
    const nextId = normalizeId(identity?.id);
    if (!currentId || !nextId) throw new Error("Page id is required");
    const existing = pages.get(currentId);
    if (!existing) throw new Error(`Page not found: ${pageId}`);
    if (currentId !== nextId && pages.has(nextId)) {
      throw new Error(`Page already exists: ${nextId}`);
    }
    pages.delete(currentId);
    pages.set(nextId, {
      ...existing,
      id: nextId,
      title: identity?.title || existing.title,
    });
    return { ok: true, id: nextId, fileName: `${nextId}.json` };
  }

  async function createPage(page) {
    const id = normalizeId(page?.id || page?.title);
    if (!id) throw new Error("Page id or title is required to create a page");
    if (pages.has(id)) throw new Error(`Page already exists: ${id}`);
    const payload = {
      type: "page",
      id,
      title: page?.title || "Untitled",
      url: requireUrl(page?.url || `/${id}`, `Page '${id}'`),
      seo: {
        title: String(page?.seo?.title || page?.title || "Untitled"),
        description: String(page?.seo?.description || ""),
        image: String(page?.seo?.image || ""),
        noIndex: Boolean(page?.seo?.noIndex),
      },
      content:
        Array.isArray(page?.content) && page.content.length > 0
          ? page.content
          : [
              {
                id: "section-page-default",
                type: "section",
                content: [],
                settings: {},
              },
            ],
    };
    pages.set(id, clone(payload));
    return clone(payload);
  }

  async function deletePage(pageId) {
    pages.delete(normalizeId(pageId));
    return { ok: true, id: normalizeId(pageId) };
  }

  function ensureCollectionRecord(collectionId) {
    const key = normalizeId(collectionId);
    if (!collections.has(key)) {
      throw new Error(`Collection not found: ${collectionId}`);
    }
    return collections.get(key);
  }

  async function listCollections() {
    return [...collections.values()].map((collection) => ({
      id: collection.config.id,
      title: collection.config.title,
      requiredFields: Object.entries(collection.config.fields || {})
        .filter(([, value]) => Boolean(value?.required))
        .map(([field]) => field),
    }));
  }

  async function createCollection(collection) {
    const id = normalizeId(collection?.id || collection?.title);
    if (!id) throw new Error("Collection id or title is required");
    if (collections.has(id))
      throw new Error(`Collection already exists: ${id}`);
    const config = {
      id,
      title: String(collection?.title || id).trim() || id,
      fields: {
        title: { type: "string", required: true },
        content: { type: "array", required: true },
        metadata: { type: "object", required: false },
        seo: { type: "object", required: false },
      },
      metadataFields: {},
      content: [
        {
          id: "section-collection-template",
          type: "section",
          content: [],
          settings: {},
        },
      ],
      collectionMetadataAllowlist: [],
    };
    collections.set(id, { config: clone(config), items: new Map() });
    return clone(config);
  }

  async function deleteCollection(collectionId) {
    const id = normalizeId(collectionId);
    collections.delete(id);
    return { ok: true, id };
  }

  async function getAllCollectionsContent() {
    const output = [];
    for (const { config, items } of collections.values()) {
      output.push({
        collectionId: config.id,
        title: config.title,
        items: [...items.values()].map(clone),
      });
    }
    return output;
  }

  async function getGroupedCollectionsContent() {
    const groups = [];
    for (const { config, items } of collections.values()) {
      groups.push({
        collectionId: config.id,
        title: config.title,
        items: [...items.values()].map((item) => ({
          id: item.id,
          title: item.title || item.id,
        })),
        configItem: {
          id: "_config",
          title: "_config.json",
        },
      });
    }
    return groups;
  }

  async function getCollectionConfig(collectionId) {
    const collection = ensureCollectionRecord(collectionId);
    return clone(collection.config);
  }

  async function saveCollectionConfig(collectionId, config) {
    const id = normalizeId(collectionId);
    const collection = ensureCollectionRecord(collectionId);
    collection.config = clone(config);
    collection.config.id = collection.config.id || id;
    return { ok: true, id };
  }

  async function updateCollectionIdentity(collectionId, identity) {
    const currentId = normalizeId(collectionId);
    const nextId = normalizeId(identity?.id);
    if (!currentId || !nextId) throw new Error("Collection id is required");
    const current = ensureCollectionRecord(collectionId);
    if (currentId !== nextId && collections.has(nextId)) {
      throw new Error(`Collection already exists: ${nextId}`);
    }
    collections.delete(currentId);
    current.config = {
      ...current.config,
      id: nextId,
      title: identity?.title || current.config.title,
    };
    collections.set(nextId, current);
    return { ok: true, id: nextId };
  }

  async function getCollectionItemContent(collectionId, itemId) {
    const id = normalizeId(itemId);
    const collection = ensureCollectionRecord(collectionId);
    const item = collection.items.get(id);
    if (!item) throw new Error(`Collection item not found: ${itemId}`);
    return clone(item);
  }

  async function getCollectionItemsMetadata(collectionId) {
    const collection = ensureCollectionRecord(collectionId);
    const items = [...collection.items.values()].map((item) => {
      const metadata = clone(item);
      delete metadata.content;
      metadata.url = requireUrl(
        item?.url,
        `Collection item '${collection.config.id}/${item.id}'`,
      );
      return {
        id: item.id,
        title: item.title || item.id,
        metadata,
      };
    });
    return { collectionId: collection.config.id, items };
  }

  async function addCollectionItem(collectionId, item) {
    const collection = ensureCollectionRecord(collectionId);
    const itemId = normalizeId(item?.id || item?.title || `item-${Date.now()}`);
    if (!itemId) throw new Error("Collection item id is required");
    if (collection.items.has(itemId)) {
      throw new Error(`Collection item already exists: ${itemId}`);
    }
    const payload = {
      id: itemId,
      ...item,
      url: requireUrl(
        item?.url || `/${collection.config.id}/${itemId}`,
        `Collection item '${collection.config.id}/${itemId}'`,
      ),
      seo: {
        title: String(item?.seo?.title || item?.title || itemId),
        description: String(item?.seo?.description || item?.excerpt || ""),
        image: String(item?.seo?.image || ""),
        noIndex: Boolean(item?.seo?.noIndex),
      },
      content:
        Array.isArray(item?.content) && item.content.length > 0
          ? item.content
          : [
              {
                id: "section-collection-item-default",
                type: "section",
                content: [],
                settings: {},
              },
            ],
    };
    collection.items.set(itemId, clone(payload));
    return clone(payload);
  }

  async function updateCollectionItem(collectionId, itemId, item) {
    const collection = ensureCollectionRecord(collectionId);
    const id = normalizeId(itemId);
    const payload = {
      id,
      ...item,
      url: requireUrl(
        item?.url,
        `Collection item '${collection.config.id}/${id}'`,
      ),
    };
    collection.items.set(id, clone(payload));
    return clone(payload);
  }

  async function updateCollectionItemIdentity(collectionId, itemId, identity) {
    const collection = ensureCollectionRecord(collectionId);
    const currentId = normalizeId(itemId);
    const nextId = normalizeId(identity?.id);
    if (!currentId || !nextId) {
      throw new Error("Collection id and item id are required");
    }
    const current = collection.items.get(currentId);
    if (!current) throw new Error(`Collection item not found: ${itemId}`);
    if (currentId !== nextId && collection.items.has(nextId)) {
      throw new Error(`Collection item already exists: ${nextId}`);
    }
    collection.items.delete(currentId);
    const next = { ...current, id: nextId };
    collection.items.set(nextId, next);
    return { ...clone(next), fileName: `${nextId}.json` };
  }

  async function deleteCollectionItem(collectionId, itemId) {
    const collection = ensureCollectionRecord(collectionId);
    const id = normalizeId(itemId);
    collection.items.delete(id);
    return { ok: true, id };
  }

  async function listSharedComponents() {
    return [...sharedComponents.values()].map((component) => ({
      id: component.id,
      title: component.title || component.id,
    }));
  }

  async function getComponentConfig(componentId) {
    const id = normalizeId(componentId);
    const component = sharedComponents.get(id);
    if (!component) throw new Error(`Component not found: ${componentId}`);
    return { ...clone(component), __fileName: `${id}.json` };
  }

  async function saveComponentConfig(componentId, componentConfig) {
    const id = normalizeId(componentId);
    const next = clone({ ...(componentConfig || {}), id });
    delete next.__fileName;
    sharedComponents.set(id, next);
    return { ok: true, id };
  }

  async function updateComponentIdentity(componentId, identity) {
    const currentId = normalizeId(componentId);
    const nextId = normalizeId(identity?.id);
    if (!nextId) throw new Error("Shared component id is required");
    const existing = sharedComponents.get(currentId);
    if (!existing) throw new Error(`Component not found: ${componentId}`);
    if (currentId !== nextId && sharedComponents.has(nextId)) {
      throw new Error(`Shared component file already exists: ${nextId}.json`);
    }
    sharedComponents.delete(currentId);
    const next = {
      ...existing,
      id: nextId,
      title:
        String(identity?.title || existing?.title || nextId).trim() || nextId,
    };
    sharedComponents.set(nextId, next);
    return {
      ok: true,
      id: nextId,
      title: next.title,
      fileName: `${nextId}.json`,
    };
  }

  async function createComponentConfig(component) {
    const id = normalizeId(component?.id || component?.title);
    if (!id) throw new Error("Component id or title is required");
    if (sharedComponents.has(id))
      throw new Error(`Component already exists: ${id}`);
    const payload = {
      type: "shared-component",
      id,
      ...component,
      content:
        Array.isArray(component?.content) && component.content.length > 0
          ? component.content
          : [
              {
                id: "section-shared-default",
                type: "section",
                content: [],
                settings: {},
              },
            ],
    };
    sharedComponents.set(id, clone(payload));
    return clone(payload);
  }

  async function deleteComponentConfig(componentId) {
    const id = normalizeId(componentId);
    sharedComponents.delete(id);
    return { ok: true, id };
  }

  async function getImageUrls(imagePath) {
    const normalizedPath = String(imagePath || "")
      .split("/")
      .filter(Boolean)
      .join("/");
    if (!normalizedPath) throw new Error("Image path is required");

    const prefix = `${normalizedPath}/`;
    const { contents } = await objectStore.listAllObjects(prefix);
    const urls = contents
      .map((entry) => entry.key)
      .filter(
        (key) =>
          !key.endsWith("/") && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(key),
      )
      .map((key) => `/${key}`);
    return { urls };
  }

  const generateSite = async () =>
    await publishSite({
      publishProvider: createPublishProvider(),
      outputDir: siteConfig.publishedOutputDir,
      appRoot,
    });
  const npmScriptService = siteConfig.uploadScript
    ? createNpmScriptService({
        projectRoot: siteConfig.contentRoot,
        scriptName: siteConfig.uploadScript,
      })
    : null;
  const deploymentService = createDeploymentService({
    upload: npmScriptService ? () => npmScriptService.run() : null,
  });
  const dataApiProvider = createDataApiProvider({
    listPages,
    getPageConfig,
    savePageConfig,
    updatePageIdentity,
    createPage,
    deletePage,
    publishSite: generateSite,
    importSquarespaceXml: async () => {
      throw new Error(
        "Squarespace XML import is not implemented for in-memory provider.",
      );
    },
    importSquarespaceStaticSiteDir: async () => {
      throw new Error(
        "Squarespace static HTML import is not implemented for in-memory provider.",
      );
    },
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
  });

  function createPublishProvider() {
    return {
      async getSiteConfig() {
        return {};
      },

      async listPageIds() {
        return [...pages.keys()].sort((a, b) => a.localeCompare(b));
      },

      async getPageConfig(pageId) {
        return await getPageConfig(pageId);
      },

      async getSharedComponent(componentId) {
        try {
          return await getComponentConfig(componentId);
        } catch {
          return null;
        }
      },

      async listCollectionIds() {
        return [...collections.keys()].sort((a, b) => a.localeCompare(b));
      },

      async getCollectionConfig(collectionId) {
        try {
          return await getCollectionConfig(collectionId);
        } catch {
          return null;
        }
      },

      async listCollectionItemsMetadata(collectionId) {
        return await getCollectionItemsMetadata(collectionId);
      },

      async getCollectionItemConfig(collectionId, fileBaseName) {
        return await getCollectionItemContent(collectionId, fileBaseName);
      },

      async copyImagesTo() {
        // No-op for in-memory demo provider.
      },

      async copyPublicTo() {
        // No-op for in-memory demo provider.
      },
    };
  }

  return {
    createDeploymentApiMiddleware: () =>
      createDeploymentApiMiddleware({ service: deploymentService }),
    createDataApiMiddleware: () => createDataApiMiddleware(dataApiProvider),
    createFilesApiMiddleware: () =>
      createFilesApiMiddleware({
        objectStore,
        metadataStore,
        foldersStore,
        imagePathStrategy: buildDefaultImagePaths,
      }),
    createPublishProvider,
    dataApiProvider,
  };
}
