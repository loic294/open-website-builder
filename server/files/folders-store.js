import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { randomUUID } from "node:crypto";

export function createFoldersStore({ contentRoot }) {
  const foldersFile = resolve(contentRoot, "images/_folders.json");

  async function read() {
    try {
      const raw = await readFile(foldersFile, "utf8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async function write(folders) {
    await mkdir(dirname(foldersFile), { recursive: true });
    await writeFile(foldersFile, JSON.stringify(folders, null, 2), "utf8");
  }

  return {
    async listFolders() {
      return read();
    },

    async createFolder(name) {
      const folders = await read();
      const id = randomUUID();
      const folder = { id, name };
      folders.push(folder);
      await write(folders);
      return folder;
    },

    async renameFolder(id, name) {
      const folders = await read();
      const folder = folders.find((f) => f.id === id);
      if (!folder) throw new Error(`Folder not found: ${id}`);
      folder.name = name;
      await write(folders);
      return folder;
    },

    async deleteFolder(id) {
      const folders = await read();
      const next = folders.filter((f) => f.id !== id);
      await write(next);
    },

    async getFolder(id) {
      const folders = await read();
      return folders.find((f) => f.id === id) || null;
    },
  };
}
