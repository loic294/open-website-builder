# Custom backend

A custom backend lets the editor use another database, remote CMS, or asset
service. OWB separates the integration into three contracts:

1. Editor content middleware for routes under `/__data`.
2. File middleware for routes under `/__data/files`.
3. A publish provider that reads a consistent snapshot of the site.

The editor exchanges complete JSON documents. Your backend decides whether to
store each document as JSON, split selected properties into columns, or map it
to another content model. Preserve properties you do not understand so plugins
and future OWB versions do not lose data.

## Content document shapes

### Page

```json
{
  "type": "page",
  "id": "about",
  "title": "About",
  "url": "/about",
  "seo": {
    "title": "About us",
    "description": "Learn more about the team.",
    "image": "/images/social/about.jpg",
    "noIndex": false
  },
  "metadata": {
    "navigationLabel": "About"
  },
  "content": [
    {
      "id": "section-about",
      "type": "section",
      "settings": {},
      "content": [
        {
          "id": "text-about",
          "type": "text",
          "content": "<h1>About</h1>",
          "settings": {}
        }
      ]
    }
  ]
}
```

`id`, `title`, `url`, and `content` are the core properties. URLs must be
root-relative paths without a query or fragment. A content node has a unique
`id`, a registered `type`, optional `settings`, and type-specific data. Nodes
that contain other nodes use a `content` array.

### Collection configuration

```json
{
  "id": "posts",
  "title": "Posts",
  "fields": {
    "title": { "type": "string", "required": true },
    "content": { "type": "array", "required": true },
    "metadata": { "type": "object", "required": false },
    "seo": { "type": "object", "required": false }
  },
  "metadataFields": {
    "author.name": { "type": "string", "required": true },
    "featuredImage": { "type": "image", "required": false }
  },
  "collectionMetadataAllowlist": ["author.name", "featuredImage"],
  "content": []
}
```

The `content` array is the template rendered around each item. A
`collection-content` node marks where the item's own content is inserted.

### Collection item

```json
{
  "id": "first-post",
  "title": "My first post",
  "url": "/posts/first-post",
  "excerpt": "A short summary.",
  "tags": ["news", "launch"],
  "metadata": {
    "author": { "name": "Ada" },
    "featuredImage": "/images/posts/first-post.jpg"
  },
  "seo": {
    "title": "My first post",
    "description": "A short summary.",
    "image": "/images/posts/first-post.jpg",
    "noIndex": false
  },
  "content": []
}
```

### Shared component

```json
{
  "type": "shared",
  "id": "site-header",
  "title": "Site header",
  "content": []
}
```

Filesystem and SQLite adapters may add `__fileName` when returning a shared
component to the editor. Properties prefixed with `__` are adapter metadata,
not published content.

## HTTP data contract

Requests and responses use `application/json`; path IDs are URL encoded. The
editor expects a non-2xx response to contain a useful `message`:

```json
{ "ok": false, "message": "Page not found: missing-page" }
```

### Pages and publishing

| Request                          | Body sent by the editor              | Successful response               |
| -------------------------------- | ------------------------------------ | --------------------------------- |
| `GET /__data/pages`              | none                                 | `[{ id, title, url }]`            |
| `GET /__data/pages/:id`          | none                                 | Complete page document            |
| `POST /__data/pages`             | Initial page document                | Created page document             |
| `PUT /__data/pages/:id`          | `{ "pageConfig": <page> }`           | `{ ok: true, id }`                |
| `PUT /__data/pages/:id/identity` | `{ "identity": { "id": "new-id" } }` | `{ ok: true, id, fileName? }`     |
| `DELETE /__data/pages/:id`       | none                                 | `{ ok: true, id }`                |
| `POST /__data/publish`           | `{}`                                 | Publish result containing `pages` |

Page creation normally sends `id`, `title`, and `url`. Add defaults for `type`,
`seo`, and `content`. A normal save sends the complete current document inside
`pageConfig`. Identity changes are separate because the storage key and the
document's `id` must change atomically.

### Collections and items

| Request                                              | Body sent by the editor              | Successful response                          |
| ---------------------------------------------------- | ------------------------------------ | -------------------------------------------- |
| `GET /__data/collections`                            | none                                 | `[{ id, title, requiredFields }]`            |
| `POST /__data/collections`                           | `{ id, title }`                      | Created collection config                    |
| `DELETE /__data/collections/:id`                     | none                                 | `{ ok: true, id }`                           |
| `GET /__data/collections/content`                    | none                                 | `[{ collectionId, title, items: [<item>] }]` |
| `GET /__data/collections/grouped-content`            | none                                 | Groups with item summaries and `configItem`  |
| `GET /__data/collections/:id/config`                 | none                                 | Complete collection config                   |
| `PUT /__data/collections/:id/config`                 | `{ "config": <collection> }`         | `{ ok: true, id }`                           |
| `PUT /__data/collections/:id/identity`               | `{ "identity": { "id": "new-id" } }` | `{ ok: true, id }`                           |
| `GET /__data/collections/:id/items/:itemId`          | none                                 | Complete item document                       |
| `GET /__data/collections/:id/items-metadata`         | none                                 | Metadata result shown below                  |
| `POST /__data/collections/:id/items`                 | Initial item document                | Created item document                        |
| `PUT /__data/collections/:id/items/:itemId`          | Complete item document               | Updated item document                        |
| `PUT /__data/collections/:id/items/:itemId/identity` | `{ "identity": { "id": "new-id" } }` | Updated item with its new `id`               |
| `DELETE /__data/collections/:id/items/:itemId`       | none                                 | `{ ok: true, id }`                           |

Metadata listings omit the potentially large `content` tree:

```json
{
  "collectionId": "posts",
  "items": [
    {
      "id": "first-post",
      "fileBaseName": "first-post",
      "title": "My first post",
      "metadata": {
        "id": "first-post",
        "title": "My first post",
        "url": "/posts/first-post",
        "excerpt": "A short summary.",
        "tags": ["news"]
      }
    }
  ]
}
```

`fileBaseName` is a storage-neutral item lookup key. The publisher later passes
it to `getCollectionItemConfig`; it does not need to be a real filename.

### Shared components

| Request                                      | Body sent by the editor              | Successful response                  |
| -------------------------------------------- | ------------------------------------ | ------------------------------------ |
| `GET /__data/shared-components`              | none                                 | `[{ id, title }]`                    |
| `GET /__data/shared-components/:id`          | none                                 | Complete shared component            |
| `POST /__data/shared-components`             | `{ id, title, content }`             | Created component                    |
| `PUT /__data/shared-components/:id`          | `{ "componentConfig": <component> }` | `{ ok: true, id }`                   |
| `PUT /__data/shared-components/:id/identity` | `{ "identity": { id, title? } }`     | `{ ok: true, id, title, fileName? }` |
| `DELETE /__data/shared-components/:id`       | none                                 | `{ ok: true, id }`                   |
| `GET /__data/images/:encodedPath`            | none                                 | `{ "urls": ["/images/..."] }`        |

## File and image contract

The simplest integration reuses OWB's file middleware with a custom object
store, metadata store, and folder store. A separate asset service can instead
implement or proxy these routes:

| Request                                  | Input                                                  | Response                    |
| ---------------------------------------- | ------------------------------------------------------ | --------------------------- |
| `GET /__data/files/folders`              | none                                                   | `[{ id, name }]`            |
| `POST /__data/files/folders`             | `{ name }`                                             | Created `{ id, name }`      |
| `PATCH /__data/files/folders/:id`        | `{ name }`                                             | Updated folder              |
| `DELETE /__data/files/folders/:id`       | none                                                   | `{ ok: true }`              |
| `GET /__data/files/images?folder=:id`    | none                                                   | Image metadata array        |
| `POST /__data/files/upload`              | Multipart fields `file` and `folderId`                 | Created image metadata      |
| `PATCH /__data/files/images/rename`      | `{ folderId, oldBasename, newBasename }`               | `{ ok: true, newBasename }` |
| `DELETE /__data/files/images`            | `{ folderId, basename }`                               | `{ ok: true }`              |
| `PATCH /__data/files/images/description` | `{ folderId, basename, description }`                  | `{ ok: true }`              |
| `PATCH /__data/files/images/place`       | `{ folderId, basename, city, stateProvince, country }` | Updated metadata            |
| `POST /__data/files/images/move`         | `{ images: [{ folderId, basename }], targetFolderId }` | Per-image results           |

An upload returns paths for the generated variants and extracted metadata:

```json
{
  "originalFilename": "portrait.jpg",
  "basename": "portrait.jpg",
  "folderId": "people",
  "folderName": "People",
  "filePath": "/images/people/portrait.jpg",
  "thumbPath": "/images/people/portrait-thumb.jpg",
  "smallPath": "/images/people/portrait-small.jpg",
  "hiresPath": "/images/people/portrait-hires.jpg",
  "fileSize": 245812,
  "width": 2400,
  "height": 1600,
  "format": "jpeg",
  "description": "",
  "uploadedAt": "2026-07-31T12:00:00.000Z"
}
```

Camera, lens, location, and place properties may also be present. Preserve them
when updating only the description, filename, folder, or place override.

## Backend provider factory

`createOwbBackendPlugin` requires two middleware factories. Each factory must
return a Connect-compatible middleware function with the signature
`(request, response, next)`:

```js
function createCustomBackendProviders(options) {
  return {
    createDataApiMiddleware() {
      return async function dataApiMiddleware(request, response, next) {
        if (!request.url?.startsWith("/__data")) {
          next();
          return;
        }

        // Authenticate, route the request, call your store, and send a response.
      };
    },

    createFilesApiMiddleware() {
      return async function filesApiMiddleware(request, response, next) {
        if (!request.url?.startsWith("/__data/files")) {
          next();
          return;
        }

        // Implement image and folder operations for your asset store.
      };
    },

    createPublishProvider() {
      return createCustomPublishProvider(options);
    },
  };
}
```

Wire it into `owb.config.js` in the same way as a built-in provider:

```js
export function plugins({ appRoot, siteConfig }) {
  const backendProviders = createCustomBackendProviders({ siteConfig });

  return [
    createOwbBackendPlugin({ appRoot, siteConfig, backendProviders }),
    createOwbImagePlugin({ imageBaseUrl: siteConfig.imageBaseUrl }),
  ];
}
```

The editor's existing route behavior is the compatibility contract. When
possible, reuse OWB's `createDataApiMiddleware` and `createFilesApiMiddleware`
with custom stores rather than reproducing HTTP routing. These lower-level
helpers are currently internal APIs, so pin the OWB version and cover the
integration with request-level tests.

## Data API provider

`createDataApiProvider(overrides)` creates a fail-fast provider object for the
editor data middleware. A complete implementation supplies these operations:

| Area                  | Methods                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pages                 | `listPages`, `getPageConfig`, `savePageConfig`, `updatePageIdentity`, `createPage`, `deletePage`                                                                                                 |
| Publishing and import | `publishSite`, `importSquarespaceXml`, `importSquarespaceStaticSiteDir`                                                                                                                          |
| Collections           | `listCollections`, `createCollection`, `deleteCollection`, `getAllCollectionsContent`, `getGroupedCollectionsContent`, `getCollectionConfig`, `saveCollectionConfig`, `updateCollectionIdentity` |
| Collection items      | `getCollectionItemContent`, `getCollectionItemsMetadata`, `addCollectionItem`, `updateCollectionItem`, `updateCollectionItemIdentity`, `deleteCollectionItem`                                    |
| Shared components     | `listSharedComponents`, `getComponentConfig`, `saveComponentConfig`, `updateComponentIdentity`, `createComponentConfig`, `deleteComponentConfig`                                                 |
| Images                | `getImageUrls`                                                                                                                                                                                   |

Methods may be asynchronous. Preserve unknown fields in page, collection, item,
and component documents so custom editor extensions do not lose data.

### Concrete resolver example

The following PostgreSQL-style example shows the important behavior: return a
small list projection, return full documents for editing, and atomically update
both the storage key and document ID when an identity changes.

```js
import { createDataApiProvider } from "open-website-builder";

const dataApiProvider = createDataApiProvider({
  async listPages() {
    const { rows } = await database.query(
      "SELECT document FROM pages ORDER BY id",
    );
    return rows.map(({ document }) => ({
      id: document.id,
      title: document.title,
      url: document.url,
    }));
  },

  async getPageConfig(pageId) {
    return await requirePageDocument(database, pageId);
  },

  async savePageConfig(pageId, pageConfig) {
    const current = await requirePageDocument(database, pageId);
    const document = { ...current, ...pageConfig, id: pageId };
    await database.query("UPDATE pages SET document = $1 WHERE id = $2", [
      document,
      pageId,
    ]);
    return { ok: true, id: pageId };
  },

  async updatePageIdentity(pageId, identity) {
    return await database.transaction(async (transaction) => {
      const page = await requirePageDocument(transaction, pageId);
      const nextId = normalizeId(identity.id);
      await transaction.query(
        "UPDATE pages SET id = $1, document = $2 WHERE id = $3",
        [nextId, { ...page, id: nextId }, pageId],
      );
      return { ok: true, id: nextId };
    });
  },

  // Implement the remaining provider methods from the route tables above.
});
```

`createDataApiProvider` adds fail-fast placeholders for omitted methods; it does
not mount routes. The built-in `createDataApiMiddleware` is currently internal,
so a separately packaged integration should implement the documented HTTP
contract or pin OWB and vendor the middleware.

## Publish provider

The static publisher calls the following methods:

```js
function createCustomPublishProvider(store, assets) {
  return {
    getSiteConfig: () => store.getSiteConfig(),
    listPageIds: () => store.listPageIds(),
    getPageConfig: (pageId) => store.getPage(pageId),
    getSharedComponent: (componentId) => store.getShared(componentId),
    listCollectionIds: () => store.listCollectionIds(),
    getCollectionConfig: (collectionId) => store.getCollection(collectionId),
    listCollectionItemsMetadata: (collectionId) =>
      store.listCollectionItemsMetadata(collectionId),
    getCollectionItemConfig: (collectionId, itemId) =>
      store.getCollectionItem(collectionId, itemId),
    copyImagesTo: (outputDir) => assets.copyImagesTo(outputDir),
    copyPublicTo: (outputDir) => assets.copyPublicTo(outputDir),
  };
}
```

`listCollectionItemsMetadata` returns
`{ collectionId, items: [{ id, fileBaseName, title, metadata }] }`. Keep
`content` out of each metadata object. The value of `fileBaseName` is passed to
`getCollectionItemConfig` as its second argument.

Use the provider in the site's publish script:

```js
const publishProvider = createCustomPublishProvider(store, assets);

await publishSite({
  publishProvider,
  outputDir: siteConfig.publishedOutputDir,
  appRoot: resolve(siteRoot, "node_modules/open-website-builder"),
});
```

For a remote backend, perform publishing in a trusted Node.js process and load
credentials from environment variables. Do not expose database or object-store
credentials to browser code.

## Reference implementations

These built-in implementations are executable examples of the contracts above:

- [Filesystem provider](https://github.com/loic294/open-website-builder/blob/main/server/providers/filesystem-backend-providers.js) composes JSON resolvers, file stores, middleware, and publishing.
- [SQLite provider](https://github.com/loic294/open-website-builder/blob/main/server/providers/sqlite-backend-providers.js) shows the same composition with a database.
- [SQLite data resolvers](https://github.com/loic294/open-website-builder/blob/main/server/data/sqlite-data-resolvers.js) demonstrate defaults, validation, CRUD return values, and identity changes.
- [In-memory provider](https://github.com/loic294/open-website-builder/blob/main/server/providers/in-memory-backend-providers.js) is a self-contained reference without persistent storage.
- [Data API middleware](https://github.com/loic294/open-website-builder/blob/main/server/data/data-api-middleware.js) defines the exact route-to-provider mapping.
- [Files API middleware](https://github.com/loic294/open-website-builder/blob/main/server/files/files-api-middleware.js) defines asset routes and store calls.
- [SQLite publish provider](https://github.com/loic294/open-website-builder/blob/main/server/publish/sqlite-publish-provider.js) demonstrates the publisher read contract.

## Implementation checklist

- Return `next()` for requests not owned by custom middleware.
- Validate IDs and prevent path traversal before reading or writing assets.
- Return JSON errors with appropriate HTTP status codes.
- Make identity changes atomic so document IDs and URLs cannot diverge.
- Publish from a consistent snapshot when editors can write concurrently.
- Test page, collection, shared component, image, and publish workflows.
