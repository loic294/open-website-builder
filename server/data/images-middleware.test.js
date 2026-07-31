import assert from "node:assert/strict";
import test from "node:test";

import { createRemoteImagesMiddleware } from "./images-middleware.js";

test("redirects local image requests to the configured image host", () => {
  const middleware = createRemoteImagesMiddleware({
    imageBaseUrl: "https://loicbellemarealford.ca/images/",
  });
  const headers = new Map();
  const response = {
    setHeader(name, value) {
      headers.set(name, value);
    },
    end() {},
  };

  middleware(
    { method: "GET", url: "/images/imported/photo.jpg?size=small" },
    response,
    () => assert.fail("image request should be handled"),
  );

  assert.equal(response.statusCode, 307);
  assert.equal(
    headers.get("Location"),
    "https://loicbellemarealford.ca/images/imported/photo.jpg?size=small",
  );
});

test("ignores non-image requests", () => {
  const middleware = createRemoteImagesMiddleware({
    imageBaseUrl: "https://loicbellemarealford.ca/images/",
  });
  let calledNext = false;

  middleware(
    { method: "GET", url: "/editor/" },
    {},
    () => {
      calledNext = true;
    },
  );

  assert.equal(calledNext, true);
});