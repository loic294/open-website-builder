import { defineConfig, loadEnv } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createOwbBackendPlugin } from "./src/plugins/owb-backend-plugin.js";
import { createOwbImagePlugin } from "./src/plugins/owb-image-plugin.js";
import tailwindcss from "@tailwindcss/vite";
import { loadSiteConfig, resolveSiteConfig } from "./src/site-config.js";
import { createR2Client } from "./server/files/r2-client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function configureEditorRoutes(server) {
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
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const siteConfig = await loadSiteConfig(env.OWB_SITE_CONFIG || "");

  const r2Config = {
    accountId: env.CLOUDFLARE_ACCOUNT_ID || "",
    bucketName: env.CLOUDFLARE_R2_BUCKET_NAME || "",
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  };

  const r2 = r2Config.accountId ? createR2Client(r2Config) : null;

  return {
    root: __dirname,
    plugins: [
      tailwindcss(),
      ...(typeof siteConfig.plugins === "function"
        ? siteConfig.plugins({ appRoot: __dirname, r2, siteConfig })
        : []),
      {
        name: "editor-route",
        configureServer: configureEditorRoutes,
        configurePreviewServer: configureEditorRoutes,
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
        allow: [__dirname, siteConfig.contentRoot]
          .filter(Boolean)
          .map((path) => resolve(path)),
      },
      watch: {
        ignored: [
          "**/node_modules/**",
          "../*", // Ignore changes outside the project root
          "!./**", // Only watch inside the current directory
        ],
      },
    },
    preview: {
      port: 3003,
    },
  };
});
