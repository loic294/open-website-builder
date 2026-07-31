import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createJsonDataResolvers } from "../../server/data/json-data-resolvers.js";
import { createDataApiMiddleware } from "../../server/data/data-api-middleware.js";
import { createRemoteImagesMiddleware } from "../../server/data/images-middleware.js";
import { createFilesApiMiddleware } from "../../server/files/files-api-middleware.js";
import { createMetadataStore } from "../../server/files/metadata-store.js";
import { createFoldersStore } from "../../server/files/folders-store.js";
import { publishSite } from "../../server/publish/publish-site.js";
import {
  importSquarespaceXml,
  importSquarespaceStaticSiteDir,
} from "../../server/import/squarespace-import-service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function fileExists(filePath) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

function getContentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function createPublishedPreviewMiddleware({ publishedDir }) {
  return async function publishedPreviewMiddleware(request, response, next) {
    const method = request.method || "GET";
    if (method !== "GET" && method !== "HEAD") {
      next();
      return;
    }

    const requestUrl = new URL(request.url || "/", "http://localhost");
    const pathName = requestUrl.pathname;

    if (
      pathName.startsWith("/__data") ||
      pathName.startsWith("/editor") ||
      pathName.startsWith("/@") ||
      pathName.startsWith("/src/") ||
      pathName.startsWith("/node_modules/")
    ) {
      next();
      return;
    }

    const candidates = [];
    if (pathName === "/") {
      candidates.push(resolve(publishedDir, "index.html"));
    } else {
      const normalizedPath = pathName.replace(/^\/+/, "").replace(/\/+$/, "");
      candidates.push(resolve(publishedDir, normalizedPath));
      candidates.push(resolve(publishedDir, normalizedPath, "index.html"));
      candidates.push(resolve(publishedDir, `${normalizedPath}.html`));
    }

    for (const candidate of candidates) {
      if (await fileExists(candidate)) {
        let payload = await readFile(candidate, "utf8");
        if (candidate.endsWith(".html")) {
          payload = payload.replace(
            /<script\s+type=["']module["']\s+src=["']\/@vite\/client["']><\/script>\s*/g,
            "",
          );
        }
        response.statusCode = 200;
        response.setHeader("Content-Type", getContentType(candidate));
        response.end(payload);
        return;
      }
    }

    if (pathName === "/") {
      response.statusCode = 404;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(
        '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px"><h2>No published site found.</h2><p>Run <code>npm run publish</code> first, then refresh.</p><p>Editor is available at <a href="/editor">/editor</a>.</p></body></html>',
      );
      return;
    }

    next();
  };
}

function createComponentStylesMiddleware({ appRoot }) {
  return async function componentStylesMiddleware(request, response, next) {
    const match = (request.url || "").match(
      /^\/owb-styles\/([a-z][a-z0-9-]*)\.css(?:\?.*)?$/,
    );
    if (!match) {
      next();
      return;
    }

    const componentName = match[1];
    const filePath = resolve(
      appRoot,
      `src/website/components/${componentName}/styles.css`,
    );

    try {
      let css = await readFile(filePath, "utf8");
      if (componentName === "captcha") {
        try {
          const altchaCss = await readFile(
            resolve(appRoot, "node_modules/altcha/dist/external/altcha.css"),
            "utf8",
          );
          css = `${css}\n/* altcha */\n${altchaCss}`;
        } catch {}
      }
      response.statusCode = 200;
      response.setHeader("Content-Type", "text/css; charset=utf-8");
      response.end(css);
    } catch {
      response.statusCode = 404;
      response.end("");
    }
  };
}

export function createOwbBackendPlugin({ appRoot, siteConfig, r2 }) {
  const metadataStore = createMetadataStore({
    contentRoot: siteConfig.contentRoot,
  });
  const foldersStore = createFoldersStore({
    contentRoot: siteConfig.contentRoot,
  });

  return {
    name: "owb-backend",
    configureServer(server) {
      server.middlewares.use(createComponentStylesMiddleware({ appRoot }));
      server.middlewares.use(
        createRemoteImagesMiddleware({ imageBaseUrl: siteConfig.imageBaseUrl }),
      );
      server.middlewares.use(
        createFilesApiMiddleware({ r2, metadataStore, foldersStore }),
      );

      const jsonResolvers = createJsonDataResolvers({
        contentRoot: siteConfig.contentRoot,
        pagesRoot: siteConfig.pagesRoot,
        collectionsRoot: siteConfig.collectionsRoot,
        sharedRoot: siteConfig.sharedRoot,
      });

      const resolvers = {
        ...jsonResolvers,
        publishSite: async () =>
          await publishSite({
            contentRoot: siteConfig.contentRoot,
            pagesRoot: siteConfig.pagesRoot,
            collectionsRoot: siteConfig.collectionsRoot,
            sharedRoot: siteConfig.sharedRoot,
            outputDir: siteConfig.publishedOutputDir,
            appRoot,
          }),
        importSquarespaceXml: async ({ xmlContent, sourceName, options }) =>
          await importSquarespaceXml({
            xmlContent,
            sourceName,
            options,
            contentRoot: siteConfig.contentRoot,
          }),
        importSquarespaceStaticSiteDir: async ({
          staticSiteDir,
          htmlContent,
          fileName,
          options,
        }) =>
          await importSquarespaceStaticSiteDir({
            staticSiteDir,
            htmlContent,
            fileName,
            options,
            contentRoot: siteConfig.contentRoot,
          }),
      };

      server.middlewares.use(createDataApiMiddleware(resolvers));
      server.middlewares.use(
        createPublishedPreviewMiddleware({
          publishedDir: siteConfig.publishedOutputDir,
        }),
      );
    },
  };
}
