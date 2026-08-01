import assert from "node:assert/strict";
import test from "node:test";

import { NpmScriptError } from "./npm-script-service.js";
import { createDeploymentApiMiddleware } from "./deployment-api-middleware.js";

function createResponse() {
  return {
    setHeader() {},
    end(body) {
      this.body = body;
    },
  };
}

test("routes the fixed publish operation", async () => {
  const middleware = createDeploymentApiMiddleware({
    service: { publish: async () => ({ generation: { pages: [] } }) },
  });
  const response = createResponse();

  await middleware(
    { method: "POST", url: "/__deployment/publish" },
    response,
    () => assert.fail("handled"),
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body).generation.pages, []);
});

test("serializes deployment command failures", async () => {
  const error = new NpmScriptError("Upload failed", {
    command: 'npm run "upload"',
    stdout: "Uploading",
    stderr: "Rejected",
    exitCode: 1,
  });
  error.phase = "upload";
  const middleware = createDeploymentApiMiddleware({
    service: {
      publish: async () => {
        throw error;
      },
    },
  });
  const response = createResponse();

  await middleware(
    { method: "POST", url: "/__deployment/publish" },
    response,
    () => assert.fail("handled"),
  );

  assert.equal(response.statusCode, 500);
  assert.deepEqual(JSON.parse(response.body), {
    message: "Upload failed",
    phase: "upload",
    command: 'npm run "upload"',
    stdout: "Uploading",
    stderr: "Rejected",
    exitCode: 1,
  });
});
