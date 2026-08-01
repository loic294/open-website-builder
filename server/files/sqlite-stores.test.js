import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { openSqliteDatabase } from "../database/sqlite-database.js";
import { createSqliteFoldersStore } from "./sqlite-folders-store.js";
import { createSqliteMetadataStore } from "./sqlite-metadata-store.js";

test("stores image folders and metadata in SQLite", async (t) => {
  const directory = await mkdtemp(resolve(tmpdir(), "owb-file-stores-"));
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const database = openSqliteDatabase(resolve(directory, "site.sqlite"));
  t.after(() => database.close());
  const folders = createSqliteFoldersStore({ database });
  const metadata = createSqliteMetadataStore({ database });

  assert.equal(
    (await folders.createFolder("Travel Photos")).id,
    "travel-photos",
  );
  assert.equal(
    (await folders.createFolder("Travel Photos")).id,
    "travel-photos-2",
  );
  await folders.renameFolder("travel-photos", "Journeys");
  assert.equal((await folders.getFolder("travel-photos")).name, "Journeys");

  await metadata.saveMetadata("travel-photos", "lake.jpg", {
    folderId: "travel-photos",
    basename: "lake.jpg",
    custom: { preserved: true },
    place: { detected: "Lake", override: null },
  });
  await metadata.updateDescription("travel-photos", "lake.jpg", "A lake");
  await metadata.updatePlaceOverride("travel-photos", "lake.jpg", "Quebec");
  await metadata.renameMetadata(
    "travel-photos",
    "lake.jpg",
    "travel-photos-2",
    "water.jpg",
  );

  const stored = await metadata.getMetadata("travel-photos-2", "water.jpg");
  assert.equal(stored.description, "A lake");
  assert.equal(stored.place.override, "Quebec");
  assert.deepEqual(stored.custom, { preserved: true });
  assert.equal((await metadata.listMetadata("travel-photos-2")).length, 1);
});
