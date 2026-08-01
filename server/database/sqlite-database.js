import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const schema = `
  CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    document TEXT NOT NULL CHECK (json_valid(document))
  );

  CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    document TEXT NOT NULL CHECK (json_valid(document))
  );

  CREATE TABLE IF NOT EXISTS collection_items (
    collection_id TEXT NOT NULL,
    id TEXT NOT NULL,
    document TEXT NOT NULL CHECK (json_valid(document)),
    PRIMARY KEY (collection_id, id),
    FOREIGN KEY (collection_id) REFERENCES collections(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS collection_items_collection_id_idx
    ON collection_items(collection_id);

  CREATE TABLE IF NOT EXISTS shared_components (
    id TEXT PRIMARY KEY,
    document TEXT NOT NULL CHECK (json_valid(document))
  );

  CREATE TABLE IF NOT EXISTS image_metadata (
    folder_id TEXT NOT NULL,
    basename TEXT NOT NULL,
    document TEXT NOT NULL CHECK (json_valid(document)),
    PRIMARY KEY (folder_id, basename)
  );

  CREATE INDEX IF NOT EXISTS image_metadata_folder_id_idx
    ON image_metadata(folder_id);

  CREATE TABLE IF NOT EXISTS image_folders (
    id TEXT PRIMARY KEY,
    document TEXT NOT NULL CHECK (json_valid(document))
  );
`;

export function openSqliteDatabase(databasePath) {
  const resolvedPath = resolve(databasePath);
  mkdirSync(dirname(resolvedPath), { recursive: true });

  const database = new DatabaseSync(resolvedPath);
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec(schema);
  return database;
}
