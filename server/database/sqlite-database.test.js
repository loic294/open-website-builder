import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { openSqliteDatabase } from "./sqlite-database.js";

test("initializes an idempotent SQLite document schema", async (t) => {
  const directory = await mkdtemp(resolve(tmpdir(), "owb-sqlite-"));
  const databasePath = resolve(directory, "nested", "site.sqlite");
  t.after(async () => rm(directory, { recursive: true, force: true }));

  const database = openSqliteDatabase(databasePath);
  t.after(() => database.close());

  assert.equal(database.prepare("PRAGMA foreign_keys").get().foreign_keys, 1);
  assert.equal(
    database.prepare("PRAGMA journal_mode").get().journal_mode,
    "wal",
  );

  const page = { id: "home", customField: { preserved: true } };
  database
    .prepare("INSERT INTO pages (id, document) VALUES (?, ?)")
    .run(page.id, JSON.stringify(page));
  assert.deepEqual(
    JSON.parse(
      database.prepare("SELECT document FROM pages WHERE id = ?").get("home")
        .document,
    ),
    page,
  );

  database
    .prepare("INSERT INTO collections (id, document) VALUES (?, ?)")
    .run("posts", JSON.stringify({ id: "posts" }));
  database
    .prepare(
      "INSERT INTO collection_items (collection_id, id, document) VALUES (?, ?, ?)",
    )
    .run("posts", "first", JSON.stringify({ id: "first" }));
  database.prepare("DELETE FROM collections WHERE id = ?").run("posts");
  assert.equal(
    database.prepare("SELECT count(*) AS count FROM collection_items").get()
      .count,
    0,
  );

  database.exec("CREATE TABLE IF NOT EXISTS probe (id INTEGER PRIMARY KEY)");
  database.exec("DROP TABLE probe");
  database.exec("PRAGMA user_version = 1");
});

test("can reopen an initialized database", async (t) => {
  const directory = await mkdtemp(resolve(tmpdir(), "owb-sqlite-reopen-"));
  const databasePath = resolve(directory, "site.sqlite");
  t.after(async () => rm(directory, { recursive: true, force: true }));

  openSqliteDatabase(databasePath).close();
  const database = openSqliteDatabase(databasePath);
  t.after(() => database.close());

  const tables = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    .all()
    .map(({ name }) => name);

  assert.deepEqual(tables, [
    "collection_items",
    "collections",
    "image_folders",
    "image_metadata",
    "pages",
    "shared_components",
  ]);
});
