import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  createNpmScriptService,
  NpmScriptError,
} from "./npm-script-service.js";

async function createProject(t, script) {
  const projectRoot = await mkdtemp(resolve(tmpdir(), "owb-deployment-"));
  t.after(async () => await rm(projectRoot, { recursive: true, force: true }));
  await writeFile(
    resolve(projectRoot, "package.json"),
    JSON.stringify({ scripts: { upload: script } }),
  );
  return projectRoot;
}

test("runs the configured npm script from the project root", async (t) => {
  const projectRoot = await createProject(
    t,
    "node -e \"require('fs').writeFileSync('uploaded.txt', process.cwd())\"",
  );
  const service = createNpmScriptService({ projectRoot });

  const result = await service.run();

  assert.equal(
    await readFile(resolve(projectRoot, "uploaded.txt"), "utf8"),
    await realpath(projectRoot),
  );
  assert.equal(result.command, 'npm run "upload"');
  assert.equal(result.exitCode, 0);
});

test("reports command output when the npm script fails", async (t) => {
  const projectRoot = await createProject(
    t,
    "node -e \"console.error('upload failed'); process.exit(3)\"",
  );
  const service = createNpmScriptService({ projectRoot });

  await assert.rejects(service.run(), (error) => {
    assert.ok(error instanceof NpmScriptError);
    assert.equal(error.command, 'npm run "upload"');
    assert.match(error.stderr, /upload failed/);
    assert.equal(error.exitCode, 3);
    return true;
  });
});
