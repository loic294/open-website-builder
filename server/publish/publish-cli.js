#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publishSite } from "./publish-site.js";
import { loadSiteConfig } from "../../src/site-config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");

async function main() {
  const siteConfig = await loadSiteConfig(process.env.OWB_SITE_CONFIG || "");

  const result = await publishSite({
    contentRoot: siteConfig.contentRoot,
    outputDir: siteConfig.publishedOutputDir,
    appRoot: projectRoot,
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
