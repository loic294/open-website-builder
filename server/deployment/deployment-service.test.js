import assert from "node:assert/strict";
import test from "node:test";

import { createDeploymentService } from "./deployment-service.js";

test("deploys in upload and repository order", async () => {
  const calls = [];
  const service = createDeploymentService({
    upload: async () => {
      calls.push("upload");
      return { stdout: "uploaded" };
    },
    repository: async () => {
      calls.push("repository");
      return { available: true, branch: "main" };
    },
  });

  const result = await service.publish();

  assert.deepEqual(calls, ["upload", "repository"]);
  assert.equal(result.upload.stdout, "uploaded");
  assert.equal(result.repository.branch, "main");
});

test("stops deployment after an upload failure and records its phase", async () => {
  let repositoryCalled = false;
  const service = createDeploymentService({
    upload: async () => {
      throw new Error("Upload failed");
    },
    repository: async () => {
      repositoryCalled = true;
    },
  });

  await assert.rejects(service.publish(), (error) => {
    assert.equal(error.phase, "upload");
    return true;
  });
  assert.equal(repositoryCalled, false);
});

test("supports repository-only deployment", async () => {
  const service = createDeploymentService({
    repository: async () => ({ available: true, branch: "main" }),
  });

  const result = await service.publish();

  assert.equal(result.upload, null);
  assert.equal(result.repository.branch, "main");
});
