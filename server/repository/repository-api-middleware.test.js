import assert from "node:assert/strict";
import test from "node:test";

import { GitCommandError } from "./git-repository-service.js";
import {
  createRepositoryApiMiddleware,
  createUnsupportedRepositoryApiMiddleware,
} from "./repository-api-middleware.js";

function createResponse() {
  const headers = new Map();
  return {
    headers,
    setHeader(name, value) {
      headers.set(name, value);
    },
    end(body) {
      this.body = body;
    },
  };
}

test("routes repository status, pull, and push to fixed service methods", async () => {
  const calls = [];
  const service = {
    async getStatus() {
      calls.push("status");
      return { available: true, branch: "main" };
    },
    async pull() {
      calls.push("pull");
      return { available: true, behind: 0 };
    },
    async commitAndPush() {
      calls.push("push");
      return { available: true, ahead: 0 };
    },
  };
  const middleware = createRepositoryApiMiddleware({
    getService: async () => service,
  });

  for (const [method, url] of [
    ["GET", "/__repository/status"],
    ["POST", "/__repository/pull"],
    ["POST", "/__repository/push"],
  ]) {
    const response = createResponse();
    await middleware({ method, url }, response, () => assert.fail("handled"));
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers.get("Content-Type"), "application/json");
  }

  assert.deepEqual(calls, ["status", "pull", "push"]);
});

test("serializes git command output on failures", async () => {
  const middleware = createRepositoryApiMiddleware({
    getService: async () => ({
      async pull() {
        throw new GitCommandError("Pull failed", {
          command: "git pull --ff-only",
          stdout: "Updating files",
          stderr: "CONFLICT",
          exitCode: 1,
        });
      },
    }),
  });
  const response = createResponse();

  await middleware(
    { method: "POST", url: "/__repository/pull" },
    response,
    () => assert.fail("handled"),
  );

  assert.equal(response.statusCode, 500);
  assert.deepEqual(JSON.parse(response.body), {
    message: "Pull failed",
    command: "git pull --ff-only",
    stdout: "Updating files",
    stderr: "CONFLICT",
    exitCode: 1,
  });
});

test("unsupported repository middleware returns JSON only for its prefix", () => {
  const middleware = createUnsupportedRepositoryApiMiddleware();
  const response = createResponse();
  middleware({ method: "GET", url: "/__repository/status" }, response, () =>
    assert.fail("repository request should be handled"),
  );
  assert.equal(response.statusCode, 404);
  assert.equal(JSON.parse(response.body).available, false);

  let calledNext = false;
  middleware({ method: "GET", url: "/editor/" }, {}, () => {
    calledNext = true;
  });
  assert.equal(calledNext, true);
});
