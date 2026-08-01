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
import { createGitRepositoryService } from "../repository/git-repository-service.js";
import { createRepositoryApiMiddleware } from "../repository/repository-api-middleware.js";
import { createNpmScriptService } from "../deployment/npm-script-service.js";
import { createDeploymentService } from "../deployment/deployment-service.js";
import { createDeploymentApiMiddleware } from "../deployment/deployment-api-middleware.js";

export function createFilesystemBackendProviders({ appRoot, siteConfig, r2 }) {
  let repositoryServicePromise = null;
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

  const generateSite = async () =>
    await publishSite({
      publishProvider,
      outputDir: siteConfig.publishedOutputDir,
      appRoot,
    });
  const getRepositoryService = () => {
    repositoryServicePromise ??= createGitRepositoryService({
      contentRoot: siteConfig.contentRoot,
    });
    return repositoryServicePromise;
  };
  const npmScriptService = siteConfig.uploadScript
    ? createNpmScriptService({
        projectRoot: siteConfig.contentRoot,
        scriptName: siteConfig.uploadScript,
      })
    : null;
  const deploymentService = createDeploymentService({
    upload: npmScriptService ? () => npmScriptService.run() : null,
    repository: siteConfig.pushToGit
      ? async () => (await getRepositoryService()).commitAndPush()
      : null,
  });

  const dataApiProvider = createDataApiProvider({
    ...dataResolvers,
    publishSite: generateSite,
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
    createRepositoryApiMiddleware: () =>
      createRepositoryApiMiddleware({
        getService: getRepositoryService,
      }),
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
  };
}
