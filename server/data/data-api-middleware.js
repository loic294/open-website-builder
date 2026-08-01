async function readRequestBody(request) {
  return await new Promise((resolveBody, rejectBody) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolveBody(body));
    request.on("error", rejectBody);
  });
}

async function parseJsonBody(request) {
  const body = await readRequestBody(request);
  return body ? JSON.parse(body) : {};
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function decodePathPart(value) {
  return decodeURIComponent(value || "");
}

export function createDataApiMiddleware(resolvers) {
  const provider = resolvers;

  return async function dataApiMiddleware(request, response, next) {
    if (!request.url?.startsWith("/__data")) {
      next();
      return;
    }

    const url = new URL(request.url, "http://localhost");
    const path = url.pathname.replace(/^\/__data\/?/, "");
    const parts = path.split("/").filter(Boolean);
    const method = request.method || "GET";

    try {
      if (method === "GET" && parts.length === 1 && parts[0] === "pages") {
        sendJson(response, 200, await provider.listPages());
        return;
      }

      if (method === "GET" && parts.length === 2 && parts[0] === "pages") {
        const pageId = decodePathPart(parts[1]);
        sendJson(response, 200, await provider.getPageConfig(pageId));
        return;
      }

      if (method === "PUT" && parts.length === 2 && parts[0] === "pages") {
        const pageId = decodePathPart(parts[1]);
        const body = await parseJsonBody(request);
        sendJson(
          response,
          200,
          await provider.savePageConfig(pageId, body.pageConfig),
        );
        return;
      }

      if (
        method === "PUT" &&
        parts.length === 3 &&
        parts[0] === "pages" &&
        parts[2] === "identity"
      ) {
        const pageId = decodePathPart(parts[1]);
        const body = await parseJsonBody(request);
        sendJson(
          response,
          200,
          await provider.updatePageIdentity(pageId, body.identity),
        );
        return;
      }

      if (method === "POST" && parts.length === 1 && parts[0] === "pages") {
        const body = await parseJsonBody(request);
        sendJson(response, 201, await provider.createPage(body));
        return;
      }

      if (method === "DELETE" && parts.length === 2 && parts[0] === "pages") {
        const pageId = decodePathPart(parts[1]);
        sendJson(response, 200, await provider.deletePage(pageId));
        return;
      }

      if (method === "POST" && parts.length === 1 && parts[0] === "publish") {
        sendJson(response, 200, await provider.publishSite());
        return;
      }

      if (
        method === "POST" &&
        parts.length === 2 &&
        parts[0] === "import" &&
        parts[1] === "squarespace"
      ) {
        const body = await parseJsonBody(request);
        sendJson(response, 200, await provider.importSquarespaceXml(body));
        return;
      }

      if (
        method === "POST" &&
        parts.length === 2 &&
        parts[0] === "import" &&
        parts[1] === "squarespace-html"
      ) {
        const body = await parseJsonBody(request);
        sendJson(
          response,
          200,
          await provider.importSquarespaceStaticSiteDir(body),
        );
        return;
      }

      if (
        method === "GET" &&
        parts.length === 1 &&
        parts[0] === "collections"
      ) {
        sendJson(response, 200, await provider.listCollections());
        return;
      }

      if (
        method === "POST" &&
        parts.length === 1 &&
        parts[0] === "collections"
      ) {
        const body = await parseJsonBody(request);
        sendJson(response, 201, await provider.createCollection(body));
        return;
      }

      if (
        method === "DELETE" &&
        parts.length === 2 &&
        parts[0] === "collections"
      ) {
        const collectionId = decodePathPart(parts[1]);
        sendJson(response, 200, await provider.deleteCollection(collectionId));
        return;
      }

      if (
        method === "GET" &&
        parts.length === 2 &&
        parts[0] === "collections" &&
        parts[1] === "content"
      ) {
        sendJson(response, 200, await provider.getAllCollectionsContent());
        return;
      }

      if (
        method === "GET" &&
        parts.length === 2 &&
        parts[0] === "collections" &&
        parts[1] === "grouped-content"
      ) {
        sendJson(response, 200, await provider.getGroupedCollectionsContent());
        return;
      }

      if (
        method === "GET" &&
        parts.length === 3 &&
        parts[0] === "collections" &&
        parts[2] === "config"
      ) {
        const collectionId = decodePathPart(parts[1]);
        sendJson(
          response,
          200,
          await provider.getCollectionConfig(collectionId),
        );
        return;
      }

      if (
        method === "PUT" &&
        parts.length === 3 &&
        parts[0] === "collections" &&
        parts[2] === "config"
      ) {
        const collectionId = decodePathPart(parts[1]);
        const body = await parseJsonBody(request);
        sendJson(
          response,
          200,
          await provider.saveCollectionConfig(collectionId, body.config),
        );
        return;
      }

      if (
        method === "PUT" &&
        parts.length === 3 &&
        parts[0] === "collections" &&
        parts[2] === "identity"
      ) {
        const collectionId = decodePathPart(parts[1]);
        const body = await parseJsonBody(request);
        sendJson(
          response,
          200,
          await provider.updateCollectionIdentity(collectionId, body.identity),
        );
        return;
      }

      if (
        method === "GET" &&
        parts.length === 4 &&
        parts[0] === "collections" &&
        parts[2] === "items"
      ) {
        const collectionId = decodePathPart(parts[1]);
        const itemId = decodePathPart(parts[3]);
        sendJson(
          response,
          200,
          await provider.getCollectionItemContent(collectionId, itemId),
        );
        return;
      }

      if (
        method === "GET" &&
        parts.length === 3 &&
        parts[0] === "collections" &&
        parts[2] === "items-metadata"
      ) {
        const collectionId = decodePathPart(parts[1]);
        sendJson(
          response,
          200,
          await provider.getCollectionItemsMetadata(collectionId),
        );
        return;
      }

      if (
        method === "POST" &&
        parts.length === 3 &&
        parts[0] === "collections" &&
        parts[2] === "items"
      ) {
        const collectionId = decodePathPart(parts[1]);
        const body = await parseJsonBody(request);
        sendJson(
          response,
          201,
          await provider.addCollectionItem(collectionId, body),
        );
        return;
      }

      if (
        method === "PUT" &&
        parts.length === 4 &&
        parts[0] === "collections" &&
        parts[2] === "items"
      ) {
        const collectionId = decodePathPart(parts[1]);
        const itemId = decodePathPart(parts[3]);
        const body = await parseJsonBody(request);
        sendJson(
          response,
          200,
          await provider.updateCollectionItem(collectionId, itemId, body),
        );
        return;
      }

      if (
        method === "PUT" &&
        parts.length === 5 &&
        parts[0] === "collections" &&
        parts[2] === "items" &&
        parts[4] === "identity"
      ) {
        const collectionId = decodePathPart(parts[1]);
        const itemId = decodePathPart(parts[3]);
        const body = await parseJsonBody(request);
        sendJson(
          response,
          200,
          await provider.updateCollectionItemIdentity(
            collectionId,
            itemId,
            body.identity,
          ),
        );
        return;
      }

      if (
        method === "DELETE" &&
        parts.length === 4 &&
        parts[0] === "collections" &&
        parts[2] === "items"
      ) {
        const collectionId = decodePathPart(parts[1]);
        const itemId = decodePathPart(parts[3]);
        sendJson(
          response,
          200,
          await provider.deleteCollectionItem(collectionId, itemId),
        );
        return;
      }

      if (
        method === "GET" &&
        parts.length === 1 &&
        parts[0] === "shared-components"
      ) {
        sendJson(response, 200, await provider.listSharedComponents());
        return;
      }

      if (
        method === "GET" &&
        parts.length === 2 &&
        parts[0] === "shared-components"
      ) {
        const componentId = decodePathPart(parts[1]);
        sendJson(response, 200, await provider.getComponentConfig(componentId));
        return;
      }

      if (
        method === "PUT" &&
        parts.length === 2 &&
        parts[0] === "shared-components"
      ) {
        const componentId = decodePathPart(parts[1]);
        const body = await parseJsonBody(request);
        sendJson(
          response,
          200,
          await provider.saveComponentConfig(componentId, body.componentConfig),
        );
        return;
      }

      if (
        method === "PUT" &&
        parts.length === 3 &&
        parts[0] === "shared-components" &&
        parts[2] === "identity"
      ) {
        const componentId = decodePathPart(parts[1]);
        const body = await parseJsonBody(request);
        sendJson(
          response,
          200,
          await provider.updateComponentIdentity(componentId, body.identity),
        );
        return;
      }

      if (
        method === "POST" &&
        parts.length === 1 &&
        parts[0] === "shared-components"
      ) {
        const body = await parseJsonBody(request);
        sendJson(response, 201, await provider.createComponentConfig(body));
        return;
      }

      if (
        method === "DELETE" &&
        parts.length === 2 &&
        parts[0] === "shared-components"
      ) {
        const componentId = decodePathPart(parts[1]);
        sendJson(
          response,
          200,
          await provider.deleteComponentConfig(componentId),
        );
        return;
      }

      if (method === "GET" && parts.length >= 1 && parts[0] === "images") {
        const imagePath = parts.slice(1).map(decodePathPart).join("/");
        sendJson(response, 200, await provider.getImageUrls(imagePath));
        return;
      }

      sendJson(response, 404, {
        ok: false,
        message: `Unknown data route: ${method} ${url.pathname}`,
      });
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
