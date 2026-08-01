function missing(method) {
  return async () => {
    throw new Error(`Backend data provider is missing method: ${method}`);
  };
}

export function createDataApiProvider(overrides = {}) {
  return {
    listPages: overrides.listPages || missing("listPages"),
    getPageConfig: overrides.getPageConfig || missing("getPageConfig"),
    savePageConfig: overrides.savePageConfig || missing("savePageConfig"),
    updatePageIdentity:
      overrides.updatePageIdentity || missing("updatePageIdentity"),
    createPage: overrides.createPage || missing("createPage"),
    deletePage: overrides.deletePage || missing("deletePage"),

    publishSite: overrides.publishSite || missing("publishSite"),
    importSquarespaceXml:
      overrides.importSquarespaceXml || missing("importSquarespaceXml"),
    importSquarespaceStaticSiteDir:
      overrides.importSquarespaceStaticSiteDir ||
      missing("importSquarespaceStaticSiteDir"),

    listCollections: overrides.listCollections || missing("listCollections"),
    createCollection: overrides.createCollection || missing("createCollection"),
    deleteCollection: overrides.deleteCollection || missing("deleteCollection"),
    getAllCollectionsContent:
      overrides.getAllCollectionsContent || missing("getAllCollectionsContent"),
    getGroupedCollectionsContent:
      overrides.getGroupedCollectionsContent ||
      missing("getGroupedCollectionsContent"),
    getCollectionConfig:
      overrides.getCollectionConfig || missing("getCollectionConfig"),
    saveCollectionConfig:
      overrides.saveCollectionConfig || missing("saveCollectionConfig"),
    updateCollectionIdentity:
      overrides.updateCollectionIdentity || missing("updateCollectionIdentity"),
    getCollectionItemContent:
      overrides.getCollectionItemContent || missing("getCollectionItemContent"),
    getCollectionItemsMetadata:
      overrides.getCollectionItemsMetadata ||
      missing("getCollectionItemsMetadata"),
    addCollectionItem:
      overrides.addCollectionItem || missing("addCollectionItem"),
    updateCollectionItem:
      overrides.updateCollectionItem || missing("updateCollectionItem"),
    updateCollectionItemIdentity:
      overrides.updateCollectionItemIdentity ||
      missing("updateCollectionItemIdentity"),
    deleteCollectionItem:
      overrides.deleteCollectionItem || missing("deleteCollectionItem"),

    listSharedComponents:
      overrides.listSharedComponents || missing("listSharedComponents"),
    getComponentConfig:
      overrides.getComponentConfig || missing("getComponentConfig"),
    saveComponentConfig:
      overrides.saveComponentConfig || missing("saveComponentConfig"),
    updateComponentIdentity:
      overrides.updateComponentIdentity || missing("updateComponentIdentity"),
    createComponentConfig:
      overrides.createComponentConfig || missing("createComponentConfig"),
    deleteComponentConfig:
      overrides.deleteComponentConfig || missing("deleteComponentConfig"),

    getImageUrls: overrides.getImageUrls || missing("getImageUrls"),
  };
}

export function createDataApiProviderFromLegacyResolvers(legacyResolvers = {}) {
  return createDataApiProvider(legacyResolvers);
}
