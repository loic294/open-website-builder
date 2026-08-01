import { createDataApiMiddleware } from "../data/data-api-middleware.js";
import { createDataApiProvider } from "../data/data-api-provider.js";
import { createSqliteDataResolvers } from "../data/sqlite-data-resolvers.js";
import { openSqliteDatabase } from "../database/sqlite-database.js";
import { createFilesApiMiddleware } from "../files/files-api-middleware.js";
import { buildDefaultImagePaths } from "../files/image-paths.js";
import { createSqliteFoldersStore } from "../files/sqlite-folders-store.js";
import { createSqliteMetadataStore } from "../files/sqlite-metadata-store.js";
import { createSqlitePublishProvider } from "../publish/sqlite-publish-provider.js";
import { publishSite } from "../publish/publish-site.js";
import { createNpmScriptService } from "../deployment/npm-script-service.js";
import { createDeploymentService } from "../deployment/deployment-service.js";
import { createDeploymentApiMiddleware } from "../deployment/deployment-api-middleware.js";

export function createSqliteBackendProviders({ appRoot, siteConfig, r2 }) {
  if (!siteConfig.sqliteDbPath) {
    throw new Error("SQLite backend requires siteConfig.sqliteDbPath");
  }

  const database = openSqliteDatabase(siteConfig.sqliteDbPath);
  const dataResolvers = createSqliteDataResolvers({
    database,
    contentRoot: siteConfig.contentRoot,
  });
  const metadataStore = createSqliteMetadataStore({ database });
  const foldersStore = createSqliteFoldersStore({ database });
  const publishProvider = createSqlitePublishProvider({
    database,
    contentRoot: siteConfig.contentRoot,
    imagesRoot: siteConfig.imagesRoot,
    publicRoot: siteConfig.publicRoot,
  });
  const unsupportedImport = async () => {
    throw new Error(
      "Squarespace import is not supported by the SQLite backend.",
    );
  };
  const generateSite = async () =>
    await publishSite({
      publishProvider,
      outputDir: siteConfig.publishedOutputDir,
      appRoot,
    });
  const npmScriptService = createNpmScriptService({
    projectRoot: siteConfig.contentRoot,
    scriptName: siteConfig.uploadScript,
  });
  const deploymentService = createDeploymentService({
    generate: generateSite,
    upload: () => npmScriptService.run(),
  });
  const dataApiProvider = createDataApiProvider({
    ...dataResolvers,
    publishSite: generateSite,
    importSquarespaceXml: unsupportedImport,
    importSquarespaceStaticSiteDir: unsupportedImport,
  });

  return {
    createDeploymentApiMiddleware: () =>
      createDeploymentApiMiddleware({ service: deploymentService }),
    createDataApiMiddleware: () => createDataApiMiddleware(dataApiProvider),
    createFilesApiMiddleware: () =>
      createFilesApiMiddleware({
        objectStore: r2,
        metadataStore,
        foldersStore,
        imagePathStrategy: buildDefaultImagePaths,
      }),
    createPublishProvider: () => publishProvider,
    close: () => database.close(),
  };
}
