import { defineConfig, loadEnv } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, stat } from "node:fs/promises";
import { createJsonDataResolvers } from "./server/data/json-data-resolvers.js";
import { createDataApiMiddleware } from "./server/data/data-api-middleware.js";
import { createImagesMiddleware } from "./server/data/images-middleware.js";
import { createFilesApiMiddleware } from "./server/files/files-api-middleware.js";
import { createR2Client } from "./server/files/r2-client.js";
import { createMetadataStore } from "./server/files/metadata-store.js";
import { createFoldersStore } from "./server/files/folders-store.js";
import { publishSite } from "./server/publish/publish-site.js";
import {
  importSquarespaceXml,
  importSquarespaceStaticSiteDir,
} from "./server/import/squarespace-import-service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentRoot = resolve(__dirname, "../my-personal-website");
const publishedOutputDir = resolve(__dirname, "dist-publish");

function getContentType(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  return "application/octet-stream";
}

async function fileExists(filePath) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  const r2Config = {
    accountId: env.CLOUDFLARE_ACCOUNT_ID || "",
    bucketName: env.CLOUDFLARE_R2_BUCKET_NAME || "",
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  };

  const r2 = r2Config.accountId ? createR2Client(r2Config) : null;
  const metadataStore = createMetadataStore({ contentRoot });
  const foldersStore = createFoldersStore({ contentRoot });

  return {
  plugins: [
    {
      name: "component-styles",
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          const match = (request.url || "").match(
            /^\/owb-styles\/([a-z][a-z0-9-]*)\.css(?:\?.*)?$/,
          );
          if (!match) {
            next();
            return;
          }
          const componentName = match[1];
          const filePath = resolve(
            __dirname,
            `src/website/components/${componentName}/styles.css`,
          );
          try {
            let css = await readFile(filePath, "utf8");
            if (componentName === "captcha") {
              try {
                const altchaCss = await readFile(
                  resolve(
                    __dirname,
                    "node_modules/altcha/dist/external/altcha.css",
                  ),
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
        });
      },
    },
    {
      name: "data-api",
      configureServer(server) {
        server.middlewares.use(createImagesMiddleware({ contentRoot, r2 }));
        server.middlewares.use(createFilesApiMiddleware({ r2, metadataStore, foldersStore }));
        const jsonResolvers = createJsonDataResolvers({ contentRoot });
        const resolvers = {
          ...jsonResolvers,
          publishSite: async () =>
            await publishSite({
              contentRoot,
              outputDir: publishedOutputDir,
              appRoot: __dirname,
            }),
          importSquarespaceXml: async ({ xmlContent, sourceName, options }) =>
            await importSquarespaceXml({
              xmlContent,
              sourceName,
              options,
              contentRoot,
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
              contentRoot,
            }),
        };
        server.middlewares.use(createDataApiMiddleware(resolvers));

        server.middlewares.use(
          createPublishedPreviewMiddleware({
            publishedDir: publishedOutputDir,
          }),
        );
      },
    },
    {
      name: "editor-route",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url === "/editor") {
            response.statusCode = 302;
            response.setHeader("Location", "/editor/");
            response.end();
            return;
          }
          if (request.url === "/editor/importer") {
            response.statusCode = 302;
            response.setHeader("Location", "/editor/importer/");
            response.end();
            return;
          }
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        editor: resolve(__dirname, "editor/index.html"),
        importer: resolve(__dirname, "editor/importer/index.html"),
      },
    },
  },
  server: {
    port: 3003,
    fs: {
      allow: [__dirname],
    },
    watch: {
      ignored: [
        "../*", // Ignore changes outside the project root
        "!./**", // Only watch inside the current directory
      ],
    },
  },
  };
});
