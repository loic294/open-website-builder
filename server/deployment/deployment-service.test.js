import assert from "node:assert/strict";
import test from "node:test";

import { createDeploymentService } from "./deployment-service.js";

test("deploys in generation, upload, and repository order", async () => {
  const calls = [];
  const service = createDeploymentService({
    generate: async () => {
      calls.push("generate");
      return { pages: ["index"] };
    },
    upload: async () => {
      calls.push("upload");
      return { stdout: "uploaded" };
    },
    afterUpload: async () => {
      calls.push("repository");
      return { available: true, branch: "main" };
    },
  });

  const result = await service.publish();

  assert.deepEqual(calls, ["generate", "upload", "repository"]);
  assert.deepEqual(result.generation.pages, ["index"]);
  assert.equal(result.repository.branch, "main");
});

test("stops deployment after an upload failure and records its phase", async () => {
  let repositoryCalled = false;
  const service = createDeploymentService({
    generate: async () => ({ pages: [] }),
    upload: async () => {
      throw new Error("Upload failed");
    },
    afterUpload: async () => {
      repositoryCalled = true;
    },
  });

  await assert.rejects(service.publish(), (error) => {
    assert.equal(error.phase, "upload");
    return true;
  });
  assert.equal(repositoryCalled, false);
});
