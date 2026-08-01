function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function serializeError(error) {
  return {
    message: error instanceof Error ? error.message : String(error),
    phase: error?.phase || "",
    command: error?.command || "",
    stdout: error?.stdout || "",
    stderr: error?.stderr || "",
    exitCode: error?.exitCode ?? null,
  };
}

export function createDeploymentApiMiddleware({ service }) {
  return async function deploymentApiMiddleware(request, response, next) {
    if (!request.url?.startsWith("/__deployment")) {
      next();
      return;
    }

    const url = new URL(request.url, "http://localhost");
    const path = url.pathname.replace(/^\/__deployment\/?/, "");
    if ((request.method || "GET") !== "POST" || path !== "publish") {
      sendJson(response, 404, { message: "Deployment route not found." });
      return;
    }

    try {
      sendJson(response, 200, await service.publish());
    } catch (error) {
      sendJson(response, 500, serializeError(error));
    }
  };
}
