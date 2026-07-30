import Busboy from "busboy";
import { extname, basename } from "node:path";
import { processImage } from "./image-processor.js";
import { buildImagePaths } from "./metadata-store.js";

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function sendError(response, statusCode, message) {
  sendJson(response, statusCode, { error: message });
}

async function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); }
    });
    request.on("error", reject);
  });
}

/** Parse multipart/form-data upload; returns { fields, file: { buffer, filename, mimeType } } */
async function parseMultipart(request) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: request.headers });
    const fields = {};
    let file = null;

    busboy.on("field", (name, value) => { fields[name] = value; });

    busboy.on("file", (fieldname, stream, info) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => {
        file = {
          buffer: Buffer.concat(chunks),
          filename: info.filename,
          mimeType: info.mimeType,
        };
      });
    });

    busboy.on("finish", () => resolve({ fields, file }));
    busboy.on("error", reject);
    request.pipe(busboy);
  });
}

/** Build a safe storage basename from an original filename (no path, sanitized). */
function sanitizeBasename(filename) {
  const ext = extname(filename);
  const name = basename(filename, ext)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${name || "image"}${ext.toLowerCase()}`;
}

export function createFilesApiMiddleware({ r2, metadataStore, foldersStore }) {
  return async function filesApiMiddleware(request, response, next) {
    if (!request.url?.startsWith("/__data/files")) {
      next();
      return;
    }

    const url = new URL(request.url, "http://localhost");
    const path = url.pathname.replace(/^\/__data\/files\/?/, "");
    const parts = path.split("/").filter(Boolean);
    const method = request.method || "GET";

    try {
      // -----------------------------------------------------------------------
      // Folders
      // -----------------------------------------------------------------------
      if (method === "GET" && parts[0] === "folders" && parts.length === 1) {
        sendJson(response, 200, await foldersStore.listFolders());
        return;
      }

      if (method === "POST" && parts[0] === "folders" && parts.length === 1) {
        const { name } = await readJsonBody(request);
        if (!name?.trim()) { sendError(response, 400, "name is required"); return; }
        sendJson(response, 201, await foldersStore.createFolder(name.trim()));
        return;
      }

      if (method === "PATCH" && parts[0] === "folders" && parts.length === 2) {
        const id = decodeURIComponent(parts[1]);
        const { name } = await readJsonBody(request);
        if (!name?.trim()) { sendError(response, 400, "name is required"); return; }
        sendJson(response, 200, await foldersStore.renameFolder(id, name.trim()));
        return;
      }

      if (method === "DELETE" && parts[0] === "folders" && parts.length === 2) {
        const id = decodeURIComponent(parts[1]);
        await deleteFolderAndContents(id, r2, metadataStore, foldersStore);
        sendJson(response, 200, { ok: true });
        return;
      }

      // -----------------------------------------------------------------------
      // Images listing
      // -----------------------------------------------------------------------
      if (method === "GET" && parts[0] === "images" && parts.length === 1) {
        const folder = url.searchParams.get("folder") || null;
        sendJson(response, 200, await metadataStore.listMetadata(folder));
        return;
      }

      // -----------------------------------------------------------------------
      // Upload
      // -----------------------------------------------------------------------
      if (method === "POST" && parts[0] === "upload" && parts.length === 1) {
        const { fields, file } = await parseMultipart(request);
        if (!file) { sendError(response, 400, "No file uploaded"); return; }
        if (!SUPPORTED_IMAGE_TYPES.has(file.mimeType)) {
          sendError(response, 400, `Unsupported type: ${file.mimeType}`);
          return;
        }
        const folderId = fields.folderId || "root";
        const folder = await foldersStore.getFolder(folderId);
        const folderName = folder?.name || folderId;
        const safeBasename = sanitizeBasename(file.filename);

        const { meta, versions } = await processImage(file.buffer, file.filename);
        const paths = buildImagePaths(folderId, safeBasename);

        await Promise.all([
          r2.putObject(paths.original.key, file.buffer, file.mimeType),
          r2.putObject(paths.thumb.key, versions.thumb, "image/jpeg"),
          r2.putObject(paths.small.key, versions.small, "image/jpeg"),
          r2.putObject(paths.hires.key, versions.hires, "image/jpeg"),
        ]);

        const metadata = {
          originalFilename: file.filename,
          basename: safeBasename,
          folderId,
          folderName,
          filePath: paths.original.path,
          thumbPath: paths.thumb.path,
          smallPath: paths.small.path,
          hiresPath: paths.hires.path,
          fileSize: meta.fileSize,
          width: meta.width,
          height: meta.height,
          format: meta.format,
          description: "",
          uploadedAt: new Date().toISOString(),
        };
        await metadataStore.saveMetadata(folderId, safeBasename, metadata);

        sendJson(response, 201, metadata);
        return;
      }

      // -----------------------------------------------------------------------
      // Rename image
      // -----------------------------------------------------------------------
      if (method === "PATCH" && parts[0] === "images" && parts[1] === "rename") {
        const { folderId, oldBasename, newBasename: rawNew } = await readJsonBody(request);
        if (!folderId || !oldBasename || !rawNew) {
          sendError(response, 400, "folderId, oldBasename and newBasename are required");
          return;
        }
        const newBasename = sanitizeBasename(rawNew);
        const oldPaths = buildImagePaths(folderId, oldBasename);
        const newPaths = buildImagePaths(folderId, newBasename);

        // Copy then delete each version
        for (const [version, oldEntry] of Object.entries(oldPaths)) {
          const newEntry = newPaths[version];
          const getResp = await r2.getObject(oldEntry.key);
          if (getResp.ok) {
            const buf = Buffer.from(await getResp.arrayBuffer());
            const ct = getResp.headers.get("content-type") || "image/jpeg";
            await r2.putObject(newEntry.key, buf, ct);
          }
        }
        await r2.deleteObjects(Object.values(oldPaths).map((e) => e.key));

        const existing = await metadataStore.getMetadata(folderId, oldBasename);
        if (existing) {
          const folder = await foldersStore.getFolder(folderId);
          await metadataStore.saveMetadata(folderId, newBasename, {
            ...existing,
            basename: newBasename,
            filePath: newPaths.original.path,
            thumbPath: newPaths.thumb.path,
            smallPath: newPaths.small.path,
            hiresPath: newPaths.hires.path,
          });
          await metadataStore.deleteMetadata(folderId, oldBasename);
        }

        sendJson(response, 200, { ok: true, newBasename });
        return;
      }

      // -----------------------------------------------------------------------
      // Delete image
      // -----------------------------------------------------------------------
      if (method === "DELETE" && parts[0] === "images" && parts.length === 1) {
        const { folderId, basename: bname } = await readJsonBody(request);
        if (!folderId || !bname) {
          sendError(response, 400, "folderId and basename are required");
          return;
        }
        const paths = buildImagePaths(folderId, bname);
        await r2.deleteObjects(Object.values(paths).map((e) => e.key));
        await metadataStore.deleteMetadata(folderId, bname);
        sendJson(response, 200, { ok: true });
        return;
      }

      // -----------------------------------------------------------------------
      // Update description
      // -----------------------------------------------------------------------
      if (method === "PATCH" && parts[0] === "images" && parts[1] === "description") {
        const { folderId, basename: bname, description } = await readJsonBody(request);
        if (!folderId || !bname) {
          sendError(response, 400, "folderId and basename are required");
          return;
        }
        await metadataStore.updateDescription(folderId, bname, description ?? "");
        sendJson(response, 200, { ok: true });
        return;
      }

      // -----------------------------------------------------------------------
      // Reprocess existing R2 files
      // -----------------------------------------------------------------------
      if (method === "POST" && parts[0] === "reprocess" && parts.length === 1) {
        const { folderId } = await readJsonBody(request);
        const results = await reprocessFolder(folderId, r2, metadataStore, foldersStore);
        sendJson(response, 200, { reprocessed: results.length, results });
        return;
      }

      next();
    } catch (error) {
      console.error("[files-api]", error);
      sendError(response, 500, String(error?.message || error));
    }
  };
}

async function deleteFolderAndContents(folderId, r2, metadataStore, foldersStore) {
  const images = await metadataStore.listMetadata(folderId);
  const keysToDelete = [];
  for (const img of images) {
    const paths = buildImagePaths(img.folderId, img.basename);
    keysToDelete.push(...Object.values(paths).map((e) => e.key));
    await metadataStore.deleteMetadata(img.folderId, img.basename);
  }
  if (keysToDelete.length) await r2.deleteObjects(keysToDelete);
  await foldersStore.deleteFolder(folderId);
}

async function reprocessFolder(folderId, r2, metadataStore, foldersStore) {
  const { processImage } = await import("./image-processor.js");
  const prefix = folderId ? `images/${folderId}/` : "images/";
  const { contents } = await r2.listObjects(prefix);
  // Only process original files (no suffix like _thumb, _small, _hires)
  const originals = contents.filter(
    (c) => !/_thumb\.jpg$/.test(c.key) && !/_small\.jpg$/.test(c.key) && !/_hires\.jpg$/.test(c.key),
  );

  const results = [];
  for (const obj of originals) {
    try {
      const keyParts = obj.key.split("/");
      const bname = keyParts[keyParts.length - 1];
      const folder = keyParts[1];
      const folderRecord = await foldersStore.getFolder(folder);

      const getResp = await r2.getObject(obj.key);
      if (!getResp.ok) continue;
      const buf = Buffer.from(await getResp.arrayBuffer());
      const { meta, versions } = await processImage(buf, bname);
      const paths = buildImagePaths(folder, bname);

      await Promise.all([
        r2.putObject(paths.thumb.key, versions.thumb, "image/jpeg"),
        r2.putObject(paths.small.key, versions.small, "image/jpeg"),
        r2.putObject(paths.hires.key, versions.hires, "image/jpeg"),
      ]);

      const existing = (await metadataStore.getMetadata(folder, bname)) || {};
      const metadata = {
        originalFilename: existing.originalFilename || bname,
        basename: bname,
        folderId: folder,
        folderName: folderRecord?.name || folder,
        filePath: paths.original.path,
        thumbPath: paths.thumb.path,
        smallPath: paths.small.path,
        hiresPath: paths.hires.path,
        fileSize: meta.fileSize,
        width: meta.width,
        height: meta.height,
        format: meta.format,
        description: existing.description || "",
        uploadedAt: existing.uploadedAt || new Date().toISOString(),
      };
      await metadataStore.saveMetadata(folder, bname, metadata);
      results.push({ key: obj.key, ok: true });
    } catch (err) {
      results.push({ key: obj.key, ok: false, error: String(err?.message) });
    }
  }
  return results;
}
