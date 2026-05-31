/**
 * Vite config for building the published-site browser bundle (published.js).
 * Run via: npm run build:pub
 * Output: dist-pub/published.js
 *
 * This bundle is loaded on published pages and hydrates Lit SSR output.
 * It is separate from the editor app build.
 */

import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/published-main.js"),
      formats: ["es"],
      fileName: () => "published.js",
    },
    outDir: "dist-pub",
    emptyOutDir: true,
    rollupOptions: {
      // Bundle everything; the published.js must be self-contained.
      external: [],
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
