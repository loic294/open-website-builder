import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { createDependencyVersionService } from "./dependency-version-service.js";

async function createFixture(t, specification = "^0.1.11") {
  const root = await mkdtemp(resolve(tmpdir(), "owb-dependencies-"));
  const appRoot = resolve(root, "editor");
  const contentRoot = resolve(root, "website");
  await Promise.all([mkdir(appRoot), mkdir(contentRoot)]);
  t.after(async () => await rm(root, { recursive: true, force: true }));
  await writeFile(
    resolve(appRoot, "package.json"),
    `${JSON.stringify({ name: "open-website-builder", version: "0.1.12" }, null, 2)}\n`,
  );
  await writeFile(
    resolve(contentRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "website",
        dependencies: { "open-website-builder": specification },
      },
      null,
      2,
    )}\n`,
  );
  return { appRoot, contentRoot };
}

test("updates the dependency, installs with Husky disabled, and commits metadata", async (t) => {
  const { appRoot, contentRoot } = await createFixture(t);
  const calls = [];
  const service = createDependencyVersionService({
    appRoot,
    contentRoot,
    install: async ({ projectRoot, env }) => {
      calls.push({ type: "install", projectRoot, husky: env.HUSKY });
      await writeFile(resolve(contentRoot, "package-lock.json"), "{}\n");
      return { exitCode: 0 };
    },
    commit: async (options) => calls.push({ type: "commit", ...options }),
  });

  const result = await service.sync();
  const projectPackage = JSON.parse(
    await readFile(resolve(contentRoot, "package.json"), "utf8"),
  );

  assert.equal(projectPackage.dependencies["open-website-builder"], "^0.1.12");
  assert.deepEqual(calls, [
    {
      type: "install",
      projectRoot: contentRoot,
      husky: "0",
    },
    {
      type: "commit",
      message: "Update open-website-builder to 0.1.12",
      paths: ["package.json", "package-lock.json"],
    },
  ]);
  assert.equal(result.updated, true);
});

for (const [before, after] of [
  ["0.1.11", "0.1.12"],
  ["~0.1.11", "~0.1.12"],
]) {
  test(`preserves the version style for ${before}`, async (t) => {
    const { appRoot, contentRoot } = await createFixture(t, before);
    const service = createDependencyVersionService({
      appRoot,
      contentRoot,
      install: async () => ({ exitCode: 0 }),
      commit: async () => {},
    });

    await service.sync();

    const projectPackage = JSON.parse(
      await readFile(resolve(contentRoot, "package.json"), "utf8"),
    );
    assert.equal(projectPackage.dependencies["open-website-builder"], after);
  });
}

test("does nothing when the dependency already matches", async (t) => {
  const { appRoot, contentRoot } = await createFixture(t, "^0.1.12");
  let called = false;
  const service = createDependencyVersionService({
    appRoot,
    contentRoot,
    install: async () => {
      called = true;
    },
    commit: async () => {
      called = true;
    },
  });

  const result = await service.sync();

  assert.deepEqual(result, { updated: false, version: "0.1.12" });
  assert.equal(called, false);
});

test("rejects unsupported dependency specifications before installing", async (t) => {
  const { appRoot, contentRoot } = await createFixture(t, "latest");
  let installed = false;
  const service = createDependencyVersionService({
    appRoot,
    contentRoot,
    install: async () => {
      installed = true;
    },
    commit: async () => {},
  });

  await assert.rejects(service.sync(), /exact, caret, or tilde version/);
  assert.equal(installed, false);
});

test("rejects a ranged editor package version", async (t) => {
  const { appRoot, contentRoot } = await createFixture(t);
  await writeFile(
    resolve(appRoot, "package.json"),
    '{"name":"open-website-builder","version":"^0.1.12"}\n',
  );
  const service = createDependencyVersionService({
    appRoot,
    contentRoot,
    install: async () => {},
    commit: async () => {},
  });

  await assert.rejects(service.sync(), /invalid version/);
});
