import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { openSqliteDatabase } from "../database/sqlite-database.js";
import { createSqliteDataResolvers } from "./sqlite-data-resolvers.js";

test("supports SQLite content CRUD and identity changes", async (t) => {
  const directory = await mkdtemp(resolve(tmpdir(), "owb-resolvers-"));
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const database = openSqliteDatabase(resolve(directory, "site.sqlite"));
  t.after(() => database.close());
  const data = createSqliteDataResolvers({ database, contentRoot: directory });

  await data.createPage({ title: "Home", url: "/", content: [] });
  await assert.rejects(
    data.createPage({ title: "Broken", url: "https://example.com" }),
    /root-relative/,
  );
  await data.savePageConfig("home", {
    id: "home",
    title: "Home",
    url: "/",
    custom: { preserved: true },
  });
  assert.deepEqual((await data.getPageConfig("home")).custom, {
    preserved: true,
  });
  await data.updatePageIdentity("home", { id: "start" });
  assert.equal((await data.listPages())[0].id, "start");

  await data.createCollection({ id: "posts", title: "Posts" });
  await data.addCollectionItem("posts", {
    id: "first",
    title: "First",
    url: "/posts/first",
    custom: ["kept"],
  });
  await data.updateCollectionIdentity("posts", { id: "articles" });
  assert.deepEqual(
    (await data.getCollectionItemContent("articles", "first")).custom,
    ["kept"],
  );
  await data.updateCollectionItemIdentity("articles", "first", {
    id: "welcome",
  });
  const metadata = await data.getCollectionItemsMetadata("articles");
  assert.equal(metadata.items[0].fileBaseName, "welcome");
  assert.equal(metadata.items[0].metadata.url, "/posts/first");

  await data.createComponentConfig({
    id: "footer",
    title: "Footer",
    custom: "value",
  });
  await data.updateComponentIdentity("footer", {
    id: "site-footer",
    title: "Site footer",
  });
  assert.equal((await data.getComponentConfig("site-footer")).custom, "value");

  await data.deleteCollection("articles");
  assert.equal(
    database.prepare("SELECT count(*) AS count FROM collection_items").get()
      .count,
    0,
  );
});
