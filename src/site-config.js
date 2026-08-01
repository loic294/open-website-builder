import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function getDefaultSiteConfig() {
  return {
    packageRoot,
    contentRoot: process.env.OWB_CONTENT_ROOT,
    pagesRoot: process.env.OWB_PAGES_ROOT,
    collectionsRoot: process.env.OWB_COLLECTIONS_ROOT,
    sharedRoot: process.env.OWB_SHARED_ROOT,
    imagesRoot: process.env.OWB_IMAGES_ROOT,
    publicRoot: process.env.OWB_PUBLIC_ROOT,
    publishedOutputDir: process.env.OWB_PUBLISHED_OUTPUT_DIR,
    imageBaseUrl: process.env.OWB_IMAGE_BASE_URL || "",
    uploadScript: process.env.OWB_UPLOAD_SCRIPT || "upload",
    pushToGit: process.env.OWB_PUSH_TO_GIT !== "false",
  };
}

export function resolveSiteConfig(overrides = {}) {
  const defaults = getDefaultSiteConfig();
  return {
    ...defaults,
    ...overrides,
    packageRoot: overrides.packageRoot || defaults.packageRoot,
    contentRoot: overrides.contentRoot || defaults.contentRoot,
    pagesRoot: overrides.pagesRoot || defaults.pagesRoot,
    collectionsRoot: overrides.collectionsRoot || defaults.collectionsRoot,
    sharedRoot: overrides.sharedRoot || defaults.sharedRoot,
    imagesRoot: overrides.imagesRoot || defaults.imagesRoot,
    publicRoot: overrides.publicRoot || defaults.publicRoot,
    publishedOutputDir:
      overrides.publishedOutputDir || defaults.publishedOutputDir,
    imageBaseUrl: overrides.imageBaseUrl || defaults.imageBaseUrl,
    uploadScript: overrides.uploadScript ?? defaults.uploadScript,
    pushToGit: overrides.pushToGit ?? defaults.pushToGit,
  };
}

export async function loadSiteConfig(configPath) {
  if (!configPath) {
    return {
      ...getDefaultSiteConfig(),
      plugins: null,
    };
  }

  const normalizedPath = configPath.startsWith("file:")
    ? configPath
    : pathToFileURL(resolve(process.cwd(), configPath)).href;
  const module = await import(normalizedPath);
  const config = module?.owbConfig || module?.default || module;
  return {
    ...resolveSiteConfig(config),
    plugins: module?.plugins || config?.plugins || null,
  };
}
