export function createOwbImagePlugin({ imageBaseUrl }) {
  return {
    name: "owb-image",
    config() {
      return {
        server: {
          middlewareMode: false,
        },
      };
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const method = request.method || "GET";
        if (method !== "GET" && method !== "HEAD") {
          next();
          return;
        }

        const requestUrl = new URL(request.url || "/", "http://localhost");
        if (!requestUrl.pathname.startsWith("/images/")) {
          next();
          return;
        }

        const targetUrl = new URL(
          `${requestUrl.pathname.slice("/images/".length)}${requestUrl.search}`,
          new URL(imageBaseUrl),
        );
        response.statusCode = 307;
        response.setHeader("Location", targetUrl.href);
        response.end();
      });
    },
  };
}
