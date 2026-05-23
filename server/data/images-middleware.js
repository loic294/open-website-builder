import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const imageMimeTypes = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function sendError(response, statusCode, message) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.end(message);
}

export function createImagesMiddleware({ contentRoot }) {
  const imagesRoot = resolve(contentRoot, "images");
  const allowedPrefix = `${imagesRoot}${sep}`;

  return async function imagesMiddleware(request, response, next) {
    const method = request.method || "GET";
    if (method !== "GET" && method !== "HEAD") {
      next();
      return;
    }

    const url = new URL(request.url || "/", "http://localhost");
    if (!url.pathname.startsWith("/images/")) {
      next();
      return;
    }

    const relativeImagePath = decodeURIComponent(
      url.pathname.slice("/images/".length),
    );
    if (!relativeImagePath) {
      sendError(response, 404, "Image not found");
      return;
    }

    const imageFilePath = resolve(imagesRoot, relativeImagePath);
    if (
      imageFilePath !== imagesRoot &&
      !imageFilePath.startsWith(allowedPrefix)
    ) {
      sendError(response, 403, "Forbidden");
      return;
    }

    try {
      const imageFileStats = await stat(imageFilePath);
      if (!imageFileStats.isFile()) {
        sendError(response, 404, "Image not found");
        return;
      }

      const extension = extname(imageFilePath).toLowerCase();
      const mimeType = imageMimeTypes[extension] || "application/octet-stream";

      response.statusCode = 200;
      response.setHeader("Content-Type", mimeType);
      response.setHeader("Content-Length", String(imageFileStats.size));

      if (method === "HEAD") {
        response.end();
        return;
      }

      const imageFileBuffer = await readFile(imageFilePath);
      response.end(imageFileBuffer);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        sendError(response, 404, "Image not found");
        return;
      }

      next(error);
    }
  };
}
