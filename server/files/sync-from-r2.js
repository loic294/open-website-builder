#!/usr/bin/env node
/**
 * Syncs local metadata and regenerates image thumbnails from the R2 bucket.
 *
 * Usage:
 *   node server/files/sync-from-r2.js [--dry-run] [--folder <folderId>] [--skip-thumbnails]
 *
 * What it does:
 *   1. Lists all objects under images/ in the R2 bucket.
 *   2. Discovers folder IDs from the key structure (images/{folderId}/...).
 *   3. Merges discovered folders into _folders.json (adds missing, keeps existing names).
 *   4. For each original image (not a _thumb/_small/_hires variant):
 *      a. Downloads the original from R2.
 *      b. Regenerates _thumb, _small, _hires JPEG versions via sharp and uploads them.
 *      c. Extracts image metadata (width, height, format, size).
 *      d. Writes/updates the metadata JSON in images/_metadata/{folderId}/{basename}.json,
 *         preserving existing description and uploadedAt when present.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createR2Client } from "./r2-client.js";
import { loadSiteConfig } from "../../src/site-config.js";
import { processImage } from "./image-processor.js";
import {
  extractPhotoMetadata,
  reverseGeocodeLocation,
} from "./photo-metadata.js";
import { buildImagePaths, createMetadataStore } from "./metadata-store.js";
import { createFoldersStore } from "./folders-store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");
const siteConfig = await loadSiteConfig(process.env.OWB_SITE_CONFIG || "");
const contentRoot = siteConfig.contentRoot;

// ── CLI flags ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SKIP_THUMBNAILS = args.includes("--skip-thumbnails");
const FOLDER_FLAG_IDX = args.indexOf("--folder");
const ONLY_FOLDER = FOLDER_FLAG_IDX !== -1 ? args[FOLDER_FLAG_IDX + 1] : null;

// ── Env loading ───────────────────────────────────────────────────────────────

async function loadEnv() {
  try {
    const raw = await readFile(resolve(projectRoot, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env not found — rely on process.env
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VARIANT_SUFFIXES = ["_thumb.jpg", "_small.jpg", "_hires.jpg"];
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
]);

function isVariant(key) {
  return VARIANT_SUFFIXES.some((s) => key.endsWith(s));
}

function isImage(key) {
  const ext = key.slice(key.lastIndexOf(".")).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function warn(msg) {
  process.stderr.write(`⚠  ${msg}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await loadEnv();

  const {
    CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_R2_BUCKET_NAME,
    CLOUDFLARE_R2_ACCESS_KEY_ID,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  } = process.env;

  if (
    !CLOUDFLARE_ACCOUNT_ID ||
    !CLOUDFLARE_R2_BUCKET_NAME ||
    !CLOUDFLARE_R2_ACCESS_KEY_ID ||
    !CLOUDFLARE_R2_SECRET_ACCESS_KEY
  ) {
    process.stderr.write(
      "Missing R2 credentials. Set them in .env or as environment variables.\n",
    );
    process.exit(1);
  }

  const r2 = createR2Client({
    accountId: CLOUDFLARE_ACCOUNT_ID,
    bucketName: CLOUDFLARE_R2_BUCKET_NAME,
    accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  });

  const metadataStore = createMetadataStore({
    contentRoot,
    imagesRoot: siteConfig.imagesRoot,
  });
  const foldersStore = createFoldersStore({
    contentRoot,
    imagesRoot: siteConfig.imagesRoot,
  });

  log(`\n🔍 Listing objects in R2 bucket "${CLOUDFLARE_R2_BUCKET_NAME}"…`);

  const prefix = ONLY_FOLDER ? `images/${ONLY_FOLDER}/` : "images/";
  const { contents } = await r2.listAllObjects(prefix);

  if (!contents.length) {
    log("  No objects found.");
    return;
  }

  log(`  Found ${contents.length} objects total.`);
  if (DRY_RUN) log("  [DRY RUN — no files will be written or uploaded]\n");

  // ── Step 1: discover folders from key structure ───────────────────────────

  const discoveredFolderIds = new Set();
  const originals = [];

  for (const obj of contents) {
    // Expected key: images/{folderId}/{basename}
    const parts = obj.key.split("/");
    if (parts.length < 3 || parts[0] !== "images") continue;
    const folderId = parts[1];
    if (!folderId || folderId === "_metadata") continue;
    if (ONLY_FOLDER && folderId !== ONLY_FOLDER) continue;

    discoveredFolderIds.add(folderId);

    if (!isVariant(obj.key)) {
      if (!isImage(obj.key)) continue;
      originals.push({
        key: obj.key,
        folderId,
        basename: parts.slice(2).join("/"),
        size: obj.size,
      });
    }
  }

  log(
    `\n📁 Discovered ${discoveredFolderIds.size} folder(s), ${originals.length} original image(s).`,
  );

  // ── Step 2: merge folders into _folders.json ──────────────────────────────

  log("\n📝 Syncing _folders.json…");
  const existingFolders = await foldersStore.listFolders();
  const existingFolderMap = new Map(existingFolders.map((f) => [f.id, f]));
  let foldersAdded = 0;

  for (const id of discoveredFolderIds) {
    if (!existingFolderMap.has(id)) {
      if (!DRY_RUN) {
        // preserve the R2 key segment as the folder id so paths stay consistent
        await foldersStore.importFolder(id, id);
      }
      log(`  + Added folder: ${id}`);
      foldersAdded++;
    } else {
      log(`  ✓ Folder exists: ${id} (${existingFolderMap.get(id).name})`);
    }
  }

  if (foldersAdded === 0) log("  All folders already up to date.");

  // ── Step 3: process originals ─────────────────────────────────────────────

  log(`\n🖼  Processing ${originals.length} original image(s)…\n`);

  const allFolders = await foldersStore.listFolders();
  const folderMap = new Map(allFolders.map((f) => [f.id, f]));

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const { key, folderId, basename, size } of originals) {
    const label = `[${processed + skipped + errors + 1}/${originals.length}] ${key}`;

    try {
      // Download original
      const getResp = await r2.getObject(key);
      if (!getResp.ok) {
        warn(`${label} — R2 fetch failed (${getResp.status}), skipping`);
        skipped++;
        continue;
      }
      const buf = Buffer.from(await getResp.arrayBuffer());

      // Process image (resize + extract metadata)
      let meta, versions;
      if (!SKIP_THUMBNAILS) {
        ({ meta, versions } = await processImage(buf, basename));
      } else {
        // Metadata-only mode: use sharp for dimensions and exifr for capture data.
        const sharp = (await import("sharp")).default;
        const sharpMeta = await sharp(buf).metadata();
        const photoMetadata = await extractPhotoMetadata(buf);
        const detectedPlace = await reverseGeocodeLocation(
          photoMetadata.originalLocation,
        );
        meta = {
          width: sharpMeta.width || 0,
          height: sharpMeta.height || 0,
          format: sharpMeta.format || "",
          fileSize: buf.length,
          camera: photoMetadata.camera,
          lens: photoMetadata.lens,
          originalLocation: photoMetadata.originalLocation,
          place: { detected: detectedPlace, override: null },
          generatedLocationStripped: null,
        };
        versions = null;
      }

      const paths = buildImagePaths(folderId, basename);
      const folderRecord = folderMap.get(folderId);

      // Upload new thumbnail versions
      if (!SKIP_THUMBNAILS && versions && !DRY_RUN) {
        await Promise.all([
          r2.putObject(paths.thumb.key, versions.thumb, "image/jpeg"),
          r2.putObject(paths.small.key, versions.small, "image/jpeg"),
          r2.putObject(paths.hires.key, versions.hires, "image/jpeg"),
        ]);
      }

      // Preserve existing metadata fields (description, uploadedAt)
      const existing =
        (await metadataStore.getMetadata(folderId, basename)) || {};
      const metadata = {
        originalFilename: existing.originalFilename || basename,
        basename,
        folderId,
        folderName: folderRecord?.name || folderId,
        filePath: paths.original.path,
        thumbPath: paths.thumb.path,
        smallPath: paths.small.path,
        hiresPath: paths.hires.path,
        fileSize: meta.fileSize,
        width: meta.width,
        height: meta.height,
        format: meta.format,
        camera: meta.camera,
        lens: meta.lens,
        originalLocation: meta.originalLocation,
        place: {
          detected: meta.place.detected,
          override: existing.place?.override || null,
        },
        generatedLocationStripped: SKIP_THUMBNAILS
          ? (existing.generatedLocationStripped ?? null)
          : meta.generatedLocationStripped,
        description: existing.description || "",
        uploadedAt: existing.uploadedAt || new Date().toISOString(),
      };

      if (!DRY_RUN) {
        await metadataStore.saveMetadata(folderId, basename, metadata);
      }

      const thumbStatus = SKIP_THUMBNAILS
        ? " (thumbnails skipped)"
        : " + thumbnails";
      log(
        `  ✓ ${label} — ${meta.width}×${meta.height} ${meta.format}${thumbStatus}`,
      );
      processed++;
    } catch (err) {
      warn(`${label} — ERROR: ${err?.message || err}`);
      errors++;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  log(`\n${"─".repeat(56)}`);
  log(`  Processed : ${processed}`);
  log(`  Skipped   : ${skipped}`);
  log(`  Errors    : ${errors}`);
  if (DRY_RUN) log(`  (dry run — no changes written)`);
  log(`${"─".repeat(56)}\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err?.message || err}\n`);
  process.exit(1);
});
