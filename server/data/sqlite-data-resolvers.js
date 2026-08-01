import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseDocument(row) {
  return row ? JSON.parse(row.document) : null;
}

function sanitizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function requireCanonicalUrl(value, entityLabel) {
  const url = String(value || "").trim();
  if (!url) throw new Error(`${entityLabel} url is required`);
  if (!url.startsWith("/") || url.startsWith("//") || /[?#]/.test(url)) {
    throw new Error(
      `${entityLabel} url must be a root-relative path without a query or fragment`,
    );
  }
  return url;
}

function defaultSection(id) {
  return [{ id, type: "section", content: [], settings: {} }];
}

function runTransaction(database, callback) {
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = callback();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function createSqliteDataResolvers({ database, contentRoot }) {
  const selectPage = database.prepare(
    "SELECT document FROM pages WHERE id = ?",
  );
  const selectCollection = database.prepare(
    "SELECT document FROM collections WHERE id = ?",
  );
  const selectItem = database.prepare(
    "SELECT document FROM collection_items WHERE collection_id = ? AND id = ?",
  );
  const selectComponent = database.prepare(
    "SELECT document FROM shared_components WHERE id = ?",
  );

  function requirePage(pageId) {
    const id = sanitizeId(pageId);
    const page = parseDocument(selectPage.get(id));
    if (!page) throw new Error(`Page not found: ${pageId}`);
    return { id, page };
  }

  function requireCollection(collectionId) {
    const id = sanitizeId(collectionId);
    const collection = parseDocument(selectCollection.get(id));
    if (!collection) throw new Error(`Collection not found: ${collectionId}`);
    return { id, collection };
  }

  function requireItem(collectionId, itemId) {
    const collection = requireCollection(collectionId);
    const id = sanitizeId(itemId);
    const item = parseDocument(selectItem.get(collection.id, id));
    if (!item) throw new Error(`Collection item not found: ${itemId}`);
    return { collection, id, item };
  }

  function requireComponent(componentId) {
    const id = sanitizeId(componentId);
    const component = parseDocument(selectComponent.get(id));
    if (!component) throw new Error(`Component not found: ${componentId}`);
    return { id, component };
  }

  async function listPages() {
    return database
      .prepare("SELECT document FROM pages ORDER BY id")
      .all()
      .map(parseDocument)
      .map((page) => ({
        id: page.id,
        url: requireCanonicalUrl(page.url, `Page '${page.id}'`),
        title: page.title || "Untitled",
      }));
  }

  async function getPageConfig(pageId) {
    return clone(requirePage(pageId).page);
  }

  async function savePageConfig(pageId, pageConfig) {
    const { id } = requirePage(pageId);
    const next = {
      ...pageConfig,
      id: pageConfig?.id || id,
      url: requireCanonicalUrl(pageConfig?.url, `Page '${pageId}'`),
    };
    database
      .prepare("UPDATE pages SET document = ? WHERE id = ?")
      .run(JSON.stringify(next), id);
    return { ok: true, id };
  }

  async function updatePageIdentity(pageId, identity) {
    const { id, page } = requirePage(pageId);
    const nextId = sanitizeId(identity?.id);
    if (!nextId) throw new Error("Page id is required");
    if (id !== nextId && selectPage.get(nextId)) {
      throw new Error(`Page already exists: ${nextId}`);
    }
    const next = { ...page, id: nextId };
    database
      .prepare("UPDATE pages SET id = ?, document = ? WHERE id = ?")
      .run(nextId, JSON.stringify(next), id);
    return { ok: true, id: nextId, fileName: `${nextId}.json` };
  }

  async function createPage(page) {
    const id = sanitizeId(page?.id || page?.title);
    if (!id) throw new Error("Page id or title is required to create a page");
    if (selectPage.get(id)) throw new Error(`Page already exists: ${id}`);
    const payload = {
      type: "page",
      id,
      title: page?.title || "Untitled",
      url: requireCanonicalUrl(page?.url || `/${id}`, `Page '${id}'`),
      seo: {
        title: String(page?.seo?.title || page?.title || "Untitled"),
        description: String(page?.seo?.description || ""),
        image: String(page?.seo?.image || ""),
        noIndex: Boolean(page?.seo?.noIndex),
      },
      content:
        Array.isArray(page?.content) && page.content.length
          ? page.content
          : defaultSection("section-page-default"),
    };
    database
      .prepare("INSERT INTO pages (id, document) VALUES (?, ?)")
      .run(id, JSON.stringify(payload));
    return clone(payload);
  }

  async function deletePage(pageId) {
    const { id } = requirePage(pageId);
    database.prepare("DELETE FROM pages WHERE id = ?").run(id);
    return { ok: true, id };
  }

  async function listCollections() {
    return database
      .prepare("SELECT document FROM collections ORDER BY id")
      .all()
      .map(parseDocument)
      .map((config) => ({
        id: config.id,
        title: config.title || config.id,
        requiredFields: Object.entries(config.fields || {})
          .filter(([, field]) => Boolean(field?.required))
          .map(([name]) => name),
      }));
  }

  async function createCollection(collection) {
    const id = sanitizeId(collection?.id || collection?.title);
    if (!id) throw new Error("Collection id or title is required");
    if (selectCollection.get(id)) {
      throw new Error(`Collection already exists: ${id}`);
    }
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
      content: defaultSection("section-collection-template"),
      collectionMetadataAllowlist: [],
    };
    database
      .prepare("INSERT INTO collections (id, document) VALUES (?, ?)")
      .run(id, JSON.stringify(config));
    return clone(config);
  }

  async function deleteCollection(collectionId) {
    const { id } = requireCollection(collectionId);
    database.prepare("DELETE FROM collections WHERE id = ?").run(id);
    return { ok: true, id };
  }

  async function getAllCollectionsContent() {
    const output = [];
    for (const config of database
      .prepare("SELECT document FROM collections ORDER BY id")
      .all()
      .map(parseDocument)) {
      const items = database
        .prepare(
          "SELECT document FROM collection_items WHERE collection_id = ? ORDER BY id",
        )
        .all(config.id)
        .map(parseDocument);
      output.push({ collectionId: config.id, title: config.title, items });
    }
    return output;
  }

  async function getGroupedCollectionsContent() {
    const groups = await getAllCollectionsContent();
    return groups.map((group) => ({
      ...group,
      items: group.items.map((item) => ({
        id: item.id,
        title: item.title || item.id,
      })),
      configItem: { id: "_config", title: "_config.json" },
    }));
  }

  async function getCollectionConfig(collectionId) {
    const { id, collection } = requireCollection(collectionId);
    if (Array.isArray(collection.content) && collection.content.length) {
      return clone(collection);
    }
    const next = {
      ...collection,
      content: defaultSection("section-collection-template"),
    };
    database
      .prepare("UPDATE collections SET document = ? WHERE id = ?")
      .run(JSON.stringify(next), id);
    return clone(next);
  }

  async function saveCollectionConfig(collectionId, config) {
    const { id } = requireCollection(collectionId);
    database
      .prepare("UPDATE collections SET document = ? WHERE id = ?")
      .run(JSON.stringify({ ...config, id: config?.id || id }), id);
    return { ok: true, id };
  }

  async function updateCollectionIdentity(collectionId, identity) {
    const { id, collection } = requireCollection(collectionId);
    const nextId = sanitizeId(identity?.id);
    if (!nextId) throw new Error("Collection id is required");
    if (id !== nextId && selectCollection.get(nextId)) {
      throw new Error(`Collection already exists: ${nextId}`);
    }
    const next = { ...collection, id: nextId };
    runTransaction(database, () => {
      database
        .prepare("UPDATE collections SET id = ?, document = ? WHERE id = ?")
        .run(nextId, JSON.stringify(next), id);
    });
    return { ok: true, id: nextId };
  }

  async function getCollectionItemContent(collectionId, itemId) {
    return clone(requireItem(collectionId, itemId).item);
  }

  async function getCollectionItemsMetadata(collectionId) {
    const { id } = requireCollection(collectionId);
    const items = database
      .prepare(
        "SELECT id, document FROM collection_items WHERE collection_id = ? ORDER BY id",
      )
      .all(id)
      .map((row) => {
        const item = parseDocument(row);
        const metadata = { ...item };
        delete metadata.content;
        metadata.url = requireCanonicalUrl(
          item.url,
          `Collection item '${id}/${row.id}'`,
        );
        return {
          id: item.id || row.id,
          fileBaseName: row.id,
          title: item.title || item.id || row.id,
          metadata,
        };
      });
    return { collectionId: id, items };
  }

  async function addCollectionItem(collectionId, item) {
    const { id: collectionIdValue } = requireCollection(collectionId);
    const id = sanitizeId(item?.id || item?.title || `item-${Date.now()}`);
    if (!id) throw new Error("Collection item id is required");
    if (selectItem.get(collectionIdValue, id)) {
      throw new Error(`Collection item already exists: ${id}`);
    }
    const payload = {
      id,
      ...item,
      url: requireCanonicalUrl(
        item?.url || `/${collectionIdValue}/${id}`,
        `Collection item '${collectionIdValue}/${id}'`,
      ),
      seo: {
        title: String(item?.seo?.title || item?.title || id),
        description: String(item?.seo?.description || item?.excerpt || ""),
        image: String(item?.seo?.image || ""),
        noIndex: Boolean(item?.seo?.noIndex),
      },
      content:
        Array.isArray(item?.content) && item.content.length
          ? item.content
          : defaultSection("section-collection-item-default"),
    };
    database
      .prepare(
        "INSERT INTO collection_items (collection_id, id, document) VALUES (?, ?, ?)",
      )
      .run(collectionIdValue, id, JSON.stringify(payload));
    return clone(payload);
  }

  async function updateCollectionItem(collectionId, itemId, item) {
    const { collection, id } = requireItem(collectionId, itemId);
    const payload = {
      id,
      ...item,
      url: requireCanonicalUrl(
        item?.url,
        `Collection item '${collection.id}/${id}'`,
      ),
    };
    database
      .prepare(
        "UPDATE collection_items SET document = ? WHERE collection_id = ? AND id = ?",
      )
      .run(JSON.stringify(payload), collection.id, id);
    return clone(payload);
  }

  async function updateCollectionItemIdentity(collectionId, itemId, identity) {
    const { collection, id, item } = requireItem(collectionId, itemId);
    const nextId = sanitizeId(identity?.id);
    if (!nextId) throw new Error("Collection id and item id are required");
    if (id !== nextId && selectItem.get(collection.id, nextId)) {
      throw new Error(`Collection item already exists: ${nextId}`);
    }
    const next = { ...item, id: nextId };
    database
      .prepare(
        "UPDATE collection_items SET id = ?, document = ? WHERE collection_id = ? AND id = ?",
      )
      .run(nextId, JSON.stringify(next), collection.id, id);
    return { ...clone(next), fileName: `${nextId}.json` };
  }

  async function deleteCollectionItem(collectionId, itemId) {
    const { collection, id } = requireItem(collectionId, itemId);
    database
      .prepare(
        "DELETE FROM collection_items WHERE collection_id = ? AND id = ?",
      )
      .run(collection.id, id);
    return { ok: true, id };
  }

  async function listSharedComponents() {
    return database
      .prepare("SELECT document FROM shared_components ORDER BY id")
      .all()
      .map(parseDocument)
      .map((component) => ({
        id: component.id,
        title: component.title || component.id,
      }));
  }

  async function getComponentConfig(componentId) {
    const { id, component } = requireComponent(componentId);
    return { ...clone(component), __fileName: `${id}.json` };
  }

  async function saveComponentConfig(componentId, componentConfig) {
    const { id } = requireComponent(componentId);
    const next = { ...componentConfig, id: componentConfig?.id || id };
    delete next.__fileName;
    database
      .prepare("UPDATE shared_components SET document = ? WHERE id = ?")
      .run(JSON.stringify(next), id);
    return { ok: true, id };
  }

  async function updateComponentIdentity(componentId, identity) {
    const { id, component } = requireComponent(componentId);
    const nextId = sanitizeId(identity?.id || component.id);
    if (!nextId) throw new Error("Shared component id is required");
    if (id !== nextId && selectComponent.get(nextId)) {
      throw new Error(`Shared component file already exists: ${nextId}.json`);
    }
    const title =
      String(identity?.title || component.title || nextId).trim() || nextId;
    const next = { ...component, id: nextId, title };
    database
      .prepare("UPDATE shared_components SET id = ?, document = ? WHERE id = ?")
      .run(nextId, JSON.stringify(next), id);
    return { ok: true, id: nextId, title, fileName: `${nextId}.json` };
  }

  async function createComponentConfig(component) {
    const id = sanitizeId(component?.id || component?.title);
    if (!id) throw new Error("Component id or title is required");
    if (selectComponent.get(id))
      throw new Error(`Component already exists: ${id}`);
    const payload = {
      type: "shared-component",
      id,
      ...component,
      content:
        Array.isArray(component?.content) && component.content.length
          ? component.content
          : defaultSection("section-shared-default"),
    };
    database
      .prepare("INSERT INTO shared_components (id, document) VALUES (?, ?)")
      .run(id, JSON.stringify(payload));
    return clone(payload);
  }

  async function deleteComponentConfig(componentId) {
    const { id } = requireComponent(componentId);
    database.prepare("DELETE FROM shared_components WHERE id = ?").run(id);
    return { ok: true, id };
  }

  async function getImageUrls(imagePath) {
    const normalizedPath = String(imagePath || "")
      .split("/")
      .filter(Boolean)
      .join("/");
    if (!normalizedPath) throw new Error("Image path is required");
    const imageDir = resolve(contentRoot, normalizedPath);
    if (!imageDir.startsWith(resolve(contentRoot))) {
      throw new Error("Invalid image path");
    }
    const entries = await readdir(imageDir, { withFileTypes: true }).catch(
      () => [],
    );
    const urls = entries
      .filter(
        (entry) =>
          entry.isFile() && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(entry.name),
      )
      .map((entry) => `/${normalizedPath}/${entry.name}`);
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
