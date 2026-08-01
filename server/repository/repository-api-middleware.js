import { GitCommandError } from "./git-repository-service.js";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function serializeError(error) {
  return {
    message: error instanceof Error ? error.message : String(error),
    command: error instanceof GitCommandError ? error.command || "" : "",
    stdout: error instanceof GitCommandError ? error.stdout || "" : "",
    stderr: error instanceof GitCommandError ? error.stderr || "" : "",
    exitCode:
      error instanceof GitCommandError ? (error.exitCode ?? null) : null,
  };
}

export function createRepositoryApiMiddleware({ getService }) {
  return async function repositoryApiMiddleware(request, response, next) {
    if (!request.url?.startsWith("/__repository")) {
      next();
      return;
    }

    const url = new URL(request.url, "http://localhost");
    const path = url.pathname.replace(/^\/__repository\/?/, "");
    const method = request.method || "GET";

    try {
      const service = await getService();
      if (method === "GET" && path === "status") {
        sendJson(response, 200, await service.getStatus({ fetch: true }));
        return;
      }
      if (method === "POST" && path === "pull") {
        sendJson(response, 200, await service.pull());
        return;
      }
      if (method === "POST" && path === "push") {
        sendJson(response, 200, await service.commitAndPush());
        return;
      }
      sendJson(response, 404, { message: "Repository route not found." });
    } catch (error) {
      sendJson(response, 500, serializeError(error));
    }
  };
}

export function createUnsupportedRepositoryApiMiddleware() {
  return function unsupportedRepositoryApiMiddleware(request, response, next) {
    if (!request.url?.startsWith("/__repository")) {
      next();
      return;
    }
    sendJson(response, 404, {
      available: false,
      message:
        "Repository actions are available only with the filesystem backend.",
    });
  };
}
