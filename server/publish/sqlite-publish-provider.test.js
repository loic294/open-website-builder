import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { openSqliteDatabase } from "../database/sqlite-database.js";
import { createSqlitePublishProvider } from "./sqlite-publish-provider.js";

test("reads SQLite content and copies filesystem assets", async (t) => {
  const directory = await mkdtemp(resolve(tmpdir(), "owb-publish-provider-"));
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const database = openSqliteDatabase(resolve(directory, "site.sqlite"));
  t.after(() => database.close());
  const imagesRoot = resolve(directory, "images");
  const publicRoot = resolve(directory, "public");
  const outputRoot = resolve(directory, "dist");
  await mkdir(imagesRoot);
  await mkdir(publicRoot);
  await writeFile(
    resolve(directory, "config.json"),
    '{"siteUrl":"https://example.com"}',
  );
  await writeFile(resolve(imagesRoot, "photo.txt"), "image");
  await writeFile(resolve(publicRoot, "robots.txt"), "User-agent: *");
  database
    .prepare("INSERT INTO pages (id, document) VALUES (?, ?)")
    .run("home", JSON.stringify({ id: "home", url: "/" }));

  const provider = createSqlitePublishProvider({
    database,
    contentRoot: directory,
    imagesRoot,
    publicRoot,
  });
  assert.deepEqual(await provider.listPageIds(), ["home"]);
  assert.equal((await provider.getSiteConfig()).siteUrl, "https://example.com");
  await provider.copyImagesTo(outputRoot);
  await provider.copyPublicTo(outputRoot);
  assert.equal(
    await readFile(resolve(outputRoot, "images/photo.txt"), "utf8"),
    "image",
  );
  assert.equal(
    await readFile(resolve(outputRoot, "robots.txt"), "utf8"),
    "User-agent: *",
  );
});
