#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publishSite } from "./publish-site.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");

async function readSiteConfig(contentRoot) {
  try {
    const raw = await readFile(resolve(contentRoot, "config.json"), "utf8");
    const trimmed = raw.trim();
    if (!trimmed) {
      return {};
    }
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function main() {
  const contentRoot = resolve(projectRoot, "../my-personal-website");
  const outputDir = resolve(projectRoot, "dist-publish");
  const siteConfig = await readSiteConfig(contentRoot);

  const result = await publishSite({
    contentRoot,
    outputDir,
    appRoot: projectRoot,
    siteUrl: siteConfig?.siteUrl,
  });

  process.stdout.write(
    `Published ${result.pages.length} page(s) to ${result.outputDir}\n`,
  );
  for (const page of result.pages) {
    process.stdout.write(`- ${page.fileName}\n`);
  }

  if (result.warnings.length > 0) {
    process.stdout.write("Warnings:\n");
    for (const warning of result.warnings) {
      process.stdout.write(`- ${warning}\n`);
    }
  }
}

main().catch((error) => {
  process.stderr.write(
    `Publish failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
