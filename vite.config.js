import { defineConfig } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageConfigPath = resolve(
  __dirname,
  "../my-personal-website/pages/index.json",
);

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

export default defineConfig({
  plugins: [
    {
      name: "save-page-config",
      configureServer(server) {
        server.middlewares.use(
          "/__page-config",
          async (request, response, next) => {
            if (request.method !== "GET") {
              next();
              return;
            }

            try {
              const fileContent = await readFile(pageConfigPath, "utf8");

              response.statusCode = 200;
              response.setHeader("Content-Type", "application/json");
              response.end(fileContent);
            } catch (error) {
              response.statusCode = 500;
              response.setHeader("Content-Type", "application/json");
              response.end(
                JSON.stringify({
                  ok: false,
                  message:
                    error instanceof Error ? error.message : String(error),
                }),
              );
            }
          },
        );

        server.middlewares.use(
          "/__save-page-config",
          async (request, response, next) => {
            if (request.method !== "POST") {
              next();
              return;
            }

            try {
              const body = await readRequestBody(request);
              const pageConfig = JSON.parse(body);

              await writeFile(
                pageConfigPath,
                `${JSON.stringify(pageConfig, null, 2)}\n`,
              );

              response.statusCode = 200;
              response.setHeader("Content-Type", "application/json");
              response.end(JSON.stringify({ ok: true }));
            } catch (error) {
              response.statusCode = 500;
              response.setHeader("Content-Type", "application/json");
              response.end(
                JSON.stringify({
                  ok: false,
                  message:
                    error instanceof Error ? error.message : String(error),
                }),
              );
            }
          },
        );
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
