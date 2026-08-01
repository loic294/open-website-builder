import assert from "node:assert/strict";
import test from "node:test";

import { resolveSiteConfig } from "./site-config.js";

test("preserves disabled deployment options", () => {
  const config = resolveSiteConfig({
    uploadScript: false,
    pushToGit: false,
  });

  assert.equal(config.uploadScript, false);
  assert.equal(config.pushToGit, false);
});
