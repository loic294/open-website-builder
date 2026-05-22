function createHttpTransport(baseUrl = "/__data") {
  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, options);
    const contentType = response.headers.get("Content-Type") || "";

    let payload = null;
    if (contentType.includes("application/json")) {
      payload = await response.json();
    }

    if (!response.ok) {
      const message = payload?.message || `Request failed: ${response.status}`;
      throw new Error(message);
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
  };
}

export function createDataLayer(transport = createHttpTransport()) {
  return {
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
    async createPage(page) {
      return await transport.post("/pages", page);
    },

    async listCollections() {
      return await transport.get("/collections");
    },
    async getAllCollectionsContent() {
      return await transport.get("/collections/content");
    },
    async getCollectionItemContent(collectionId, itemId) {
      return await transport.get(
        `/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(itemId)}`,
      );
    },
    async addCollectionItem(collectionId, item) {
      return await transport.post(
        `/collections/${encodeURIComponent(collectionId)}/items`,
        item,
      );
    },
    async updateCollectionItem(collectionId, itemId, item) {
      return await transport.put(
        `/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(itemId)}`,
        item,
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
    async createComponentConfig(component) {
      return await transport.post("/shared-components", component);
    },
  };
}

export const dataLayer = createDataLayer();
