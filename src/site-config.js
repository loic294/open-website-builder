import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(fileURLToPath(new URL("..", import.meta.url)));

function resolveFromPackageRoot(relativePath) {
  return resolve(packageRoot, relativePath);
}

export function getDefaultSiteConfig() {
  return {
    packageRoot,
    contentRoot: process.env.OWB_CONTENT_ROOT,
    publishedOutputDir: process.env.OWB_PUBLISHED_OUTPUT_DIR,
    imageBaseUrl: process.env.OWB_IMAGE_BASE_URL || "",
  };
}

export function resolveSiteConfig(overrides = {}) {
  const defaults = getDefaultSiteConfig();
  return {
    ...defaults,
    ...overrides,
    packageRoot: overrides.packageRoot || defaults.packageRoot,
    contentRoot: overrides.contentRoot || defaults.contentRoot,
    publishedOutputDir:
      overrides.publishedOutputDir || defaults.publishedOutputDir,
    imageBaseUrl: overrides.imageBaseUrl || defaults.imageBaseUrl,
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
