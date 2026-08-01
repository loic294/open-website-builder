function createHttpTransport(
  baseUrl = "/__data",
  { emitDataChanges = true } = {},
) {
  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, options);
    const contentType = response.headers.get("Content-Type") || "";

    let payload = null;
    if (contentType.includes("application/json")) {
      payload = await response.json();
    }

    if (!response.ok) {
      const message = payload?.message || `Request failed: ${response.status}`;
      const error = new Error(message);
      if (payload && typeof payload === "object") {
        Object.assign(error, payload);
      }
      error.status = response.status;
      throw error;
    }

    if (
      emitDataChanges &&
      options.method &&
      options.method !== "GET" &&
      path !== "/publish" &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new CustomEvent("editor-data-changed"));
    }

    return payload;
  }

  return {
    get(path) {
      return request(path, { method: "GET" });
    },
    post(path, body) {
      return request(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    },
    put(path, body) {
      return request(path, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    },
    delete(path) {
      return request(path, { method: "DELETE" });
    },
  };
}

export function createDataLayer(
  transport = createHttpTransport(),
  repositoryTransport = createHttpTransport("/__repository", {
    emitDataChanges: false,
  }),
  deploymentTransport = createHttpTransport("/__deployment", {
    emitDataChanges: false,
  }),
) {
  return {
    async publishProject() {
      return await deploymentTransport.post("/publish", {});
    },
    async getRepositoryStatus() {
      return await repositoryTransport.get("/status");
    },
    async pullRepository() {
      return await repositoryTransport.post("/pull", {});
    },
    async pushRepository() {
      return await repositoryTransport.post("/push", {});
    },
    async listPages() {
      return await transport.get("/pages");
    },
    async getPageConfig(pageId) {
      return await transport.get(`/pages/${encodeURIComponent(pageId)}`);
    },
    async savePageConfig(pageId, pageConfig) {
      return await transport.put(`/pages/${encodeURIComponent(pageId)}`, {
        pageConfig,
      });
    },
    async updatePageIdentity(pageId, identity) {
      return await transport.put(
        `/pages/${encodeURIComponent(pageId)}/identity`,
        { identity },
      );
    },
    async createPage(page) {
      return await transport.post("/pages", page);
    },
    async deletePage(pageId) {
      return await transport.delete(`/pages/${encodeURIComponent(pageId)}`);
    },
    async publishSite() {
      return await transport.post("/publish", {});
    },
    async importSquarespaceXml({ xmlContent, sourceName, options = {} }) {
      return await transport.post("/import/squarespace", {
        xmlContent,
        sourceName,
        options,
      });
    },
    async importSquarespaceStaticSiteDir({
      staticSiteDir,
      htmlContent,
      fileName,
      options = {},
    }) {
      return await transport.post("/import/squarespace-html", {
        staticSiteDir,
        htmlContent,
        fileName,
        options,
      });
    },

    async listCollections() {
      return await transport.get("/collections");
    },
    async createCollection(collection) {
      return await transport.post("/collections", collection);
    },
    async deleteCollection(collectionId) {
      return await transport.delete(
        `/collections/${encodeURIComponent(collectionId)}`,
      );
    },
    async getAllCollectionsContent() {
      return await transport.get("/collections/content");
    },
    async getGroupedCollectionsContent() {
      return await transport.get("/collections/grouped-content");
    },
    async getCollectionConfig(collectionId) {
      return await transport.get(
        `/collections/${encodeURIComponent(collectionId)}/config`,
      );
    },
    async saveCollectionConfig(collectionId, config) {
      return await transport.put(
        `/collections/${encodeURIComponent(collectionId)}/config`,
        { config },
      );
    },
    async updateCollectionIdentity(collectionId, identity) {
      return await transport.put(
        `/collections/${encodeURIComponent(collectionId)}/identity`,
        { identity },
      );
    },
    async getCollectionItemContent(collectionId, itemId) {
      return await transport.get(
        `/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(itemId)}`,
      );
    },
    async getCollectionItemsMetadata(collectionId) {
      return await transport.get(
        `/collections/${encodeURIComponent(collectionId)}/items-metadata`,
      );
    },
    async addCollectionItem(collectionId, item) {
      return await transport.post(
        `/collections/${encodeURIComponent(collectionId)}/items`,
        item,
      );
    },
    async deleteCollectionItem(collectionId, itemId) {
      return await transport.delete(
        `/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(itemId)}`,
      );
    },
    async updateCollectionItem(collectionId, itemId, item) {
      return await transport.put(
        `/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(itemId)}`,
        item,
      );
    },
    async updateCollectionItemIdentity(collectionId, itemId, identity) {
      return await transport.put(
        `/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(itemId)}/identity`,
        { identity },
      );
    },

    async listSharedComponents() {
      return await transport.get("/shared-components");
    },
    async getComponentConfig(componentId) {
      return await transport.get(
        `/shared-components/${encodeURIComponent(componentId)}`,
      );
    },
    async saveComponentConfig(componentId, componentConfig) {
      return await transport.put(
        `/shared-components/${encodeURIComponent(componentId)}`,
        { componentConfig },
      );
    },
    async updateComponentIdentity(componentId, identity) {
      return await transport.put(
        `/shared-components/${encodeURIComponent(componentId)}/identity`,
        { identity },
      );
    },
    async createComponentConfig(component) {
      return await transport.post("/shared-components", component);
    },
    async deleteComponentConfig(componentId) {
      return await transport.delete(
        `/shared-components/${encodeURIComponent(componentId)}`,
      );
    },
    async getImageUrls(imagePath) {
      return await transport.get(`/images/${encodeURIComponent(imagePath)}`);
    },
  };
}

export const dataLayer = createDataLayer();
