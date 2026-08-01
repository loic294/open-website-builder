import { createJsonDataResolvers } from "../data/json-data-resolvers.js";
import { createMetadataStore } from "../files/metadata-store.js";
import { createFoldersStore } from "../files/folders-store.js";
import { buildDefaultImagePaths } from "../files/image-paths.js";
import { createDataApiMiddleware } from "../data/data-api-middleware.js";
import { createFilesApiMiddleware } from "../files/files-api-middleware.js";
import { publishSite } from "../publish/publish-site.js";
import { createFilesystemPublishProvider } from "../publish/publish-provider.js";
import { createDataApiProvider } from "../data/data-api-provider.js";
import {
  importSquarespaceXml,
  importSquarespaceStaticSiteDir,
} from "../import/squarespace-import-service.js";

export function createFilesystemBackendProviders({ appRoot, siteConfig, r2 }) {
  const publishProvider = createFilesystemPublishProvider({
    contentRoot: siteConfig.contentRoot,
    pagesRoot: siteConfig.pagesRoot,
    collectionsRoot: siteConfig.collectionsRoot,
    sharedRoot: siteConfig.sharedRoot,
    imagesRoot: siteConfig.imagesRoot,
    publicRoot: siteConfig.publicRoot,
  });

  const dataResolvers = createJsonDataResolvers({
    contentRoot: siteConfig.contentRoot,
    pagesRoot: siteConfig.pagesRoot,
    collectionsRoot: siteConfig.collectionsRoot,
    sharedRoot: siteConfig.sharedRoot,
    imagesRoot: siteConfig.imagesRoot,
  });

  const metadataStore = createMetadataStore({
    contentRoot: siteConfig.contentRoot,
    imagesRoot: siteConfig.imagesRoot,
  });

  const foldersStore = createFoldersStore({
    contentRoot: siteConfig.contentRoot,
    imagesRoot: siteConfig.imagesRoot,
  });

  const dataApiProvider = createDataApiProvider({
    ...dataResolvers,
    publishSite: async () =>
      await publishSite({
        publishProvider,
        outputDir: siteConfig.publishedOutputDir,
        appRoot,
      }),
    importSquarespaceXml: async ({ xmlContent, sourceName, options }) =>
      await importSquarespaceXml({
        xmlContent,
        sourceName,
        options,
        contentRoot: siteConfig.contentRoot,
      }),
    importSquarespaceStaticSiteDir: async ({
      staticSiteDir,
      htmlContent,
      fileName,
      options,
    }) =>
      await importSquarespaceStaticSiteDir({
        staticSiteDir,
        htmlContent,
        fileName,
        options,
        contentRoot: siteConfig.contentRoot,
      }),
  });

  return {
    createDataApiMiddleware: () => createDataApiMiddleware(dataApiProvider),
    createFilesApiMiddleware: () =>
      createFilesApiMiddleware({
        objectStore: r2,
        metadataStore,
        foldersStore,
        imagePathStrategy: buildDefaultImagePaths,
      }),
    createPublishProvider: () => publishProvider,
  };
}
