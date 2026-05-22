import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createJsonDataResolvers } from "./server/data/json-data-resolvers.js";
import { createDataApiMiddleware } from "./server/data/data-api-middleware.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentRoot = resolve(__dirname, "../my-personal-website");

export default defineConfig({
  plugins: [
    {
      name: "data-api",
      configureServer(server) {
        const resolvers = createJsonDataResolvers({ contentRoot });
        server.middlewares.use(createDataApiMiddleware(resolvers));
      },
    },
  ],
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
});
