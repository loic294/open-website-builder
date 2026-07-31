import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSiteConfig } from "../../src/site-config.js";

const appRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

const siteConfig = await loadSiteConfig(process.env.OWB_SITE_CONFIG || "");
const contentRoot = siteConfig.contentRoot;

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function validateUrl(url, label, errors) {
  const value = String(url || "").trim();
  if (!value) {
    errors.push(`${label}: top-level url is required`);
    return "";
  }
  if (!value.startsWith("/") || value.startsWith("//") || /[?#]/.test(value)) {
    errors.push(
      `${label}: url must be a root-relative path without a query or fragment`,
    );
  }
  return value;
}

async function collectJsonRecords(directoryPath, prefix, skipConfig = false) {
  const records = [];
  for (const fileName of await readdir(directoryPath)) {
    if (
      !fileName.endsWith(".json") ||
      (skipConfig && fileName === "_config.json")
    ) {
      continue;
    }
    records.push({
      label: `${prefix}/${fileName}`,
      value: await readJson(resolve(directoryPath, fileName)),
    });
  }
  return records;
}

const records = await collectJsonRecords(
  resolve(contentRoot, "pages"),
  "pages",
);
const collectionsDir = resolve(contentRoot, "collections");
for (const entry of await readdir(collectionsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  records.push(
    ...(await collectJsonRecords(
      resolve(collectionsDir, entry.name),
      `collections/${entry.name}`,
      true,
    )),
  );
}

const errors = [];
const recordsByUrl = new Map();
for (const record of records) {
  const url = validateUrl(record.value?.url, record.label, errors);
  if (url) {
    recordsByUrl.set(url, [...(recordsByUrl.get(url) || []), record.label]);
  }

  const serialized = JSON.stringify(record.value);
  if (/\{\{\s*(sourceUrl|slug)\s*\}\}/.test(serialized)) {
    errors.push(`${record.label}: content uses an import-reference URL token`);
  }
}

for (const [url, matchingRecords] of recordsByUrl) {
  if (matchingRecords.length > 1) {
    errors.push(`${url}: duplicate url in ${matchingRecords.join(", ")}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${records.length} canonical URLs.`);
}
