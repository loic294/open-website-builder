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
        sendJson(response, 200, await resolvers.listPages());
        return;
      }

      if (method === "GET" && parts.length === 2 && parts[0] === "pages") {
        const pageId = decodePathPart(parts[1]);
        sendJson(response, 200, await resolvers.getPageConfig(pageId));
        return;
      }

      if (method === "PUT" && parts.length === 2 && parts[0] === "pages") {
        const pageId = decodePathPart(parts[1]);
        const body = await parseJsonBody(request);
        sendJson(
          response,
          200,
          await resolvers.savePageConfig(pageId, body.pageConfig),
        );
        return;
      }

      if (method === "POST" && parts.length === 1 && parts[0] === "pages") {
        const body = await parseJsonBody(request);
        sendJson(response, 201, await resolvers.createPage(body));
        return;
      }

      if (method === "POST" && parts.length === 1 && parts[0] === "publish") {
        sendJson(response, 200, await resolvers.publishSite());
        return;
      }

      if (
        method === "GET" &&
        parts.length === 1 &&
        parts[0] === "collections"
      ) {
        sendJson(response, 200, await resolvers.listCollections());
        return;
      }

      if (
        method === "GET" &&
        parts.length === 2 &&
        parts[0] === "collections" &&
        parts[1] === "content"
      ) {
        sendJson(response, 200, await resolvers.getAllCollectionsContent());
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
          await resolvers.getCollectionItemContent(collectionId, itemId),
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
          await resolvers.addCollectionItem(collectionId, body),
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
          await resolvers.updateCollectionItem(collectionId, itemId, body),
        );
        return;
      }

      if (
        method === "GET" &&
        parts.length === 1 &&
        parts[0] === "shared-components"
      ) {
        sendJson(response, 200, await resolvers.listSharedComponents());
        return;
      }

      if (
        method === "GET" &&
        parts.length === 2 &&
        parts[0] === "shared-components"
      ) {
        const componentId = decodePathPart(parts[1]);
        sendJson(
          response,
          200,
          await resolvers.getComponentConfig(componentId),
        );
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
          await resolvers.saveComponentConfig(
            componentId,
            body.componentConfig,
          ),
        );
        return;
      }

      if (
        method === "POST" &&
        parts.length === 1 &&
        parts[0] === "shared-components"
      ) {
        const body = await parseJsonBody(request);
        sendJson(response, 201, await resolvers.createComponentConfig(body));
        return;
      }

      if (method === "GET" && parts.length >= 1 && parts[0] === "images") {
        const imagePath = parts.slice(1).map(decodePathPart).join("/");
        sendJson(response, 200, await resolvers.getImageUrls(imagePath));
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
