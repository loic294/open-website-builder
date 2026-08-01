# Filesystem backend

The filesystem backend stores pages, collections, and shared components as
JSON. It is a good default when content should be readable in pull requests and
versioned with the rest of the website.

Complete the [project setup](/getting-started) first.

## Create the content directories

```bash
mkdir -p data/pages data/collections data/shared images public
```

Create `data/pages/home.json`:

```json
{
  "type": "page",
  "id": "home",
  "title": "Home",
  "url": "/",
  "content": [
    {
      "id": "section-home",
      "type": "section",
      "content": [
        {
          "id": "text-home",
          "type": "text",
          "content": "<h1>Hello, world.</h1>",
          "settings": {}
        }
      ],
      "settings": {}
    }
  ]
}
```

## Configure the editor backend

Create `owb.config.js`:

```js
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFilesystemBackendProviders,
  createOwbBackendPlugin,
  createOwbImagePlugin,
} from "open-website-builder";

const siteRoot = dirname(fileURLToPath(import.meta.url));

export const owbConfig = {
  contentRoot: siteRoot,
  pagesRoot: resolve(siteRoot, "data/pages"),
  collectionsRoot: resolve(siteRoot, "data/collections"),
  sharedRoot: resolve(siteRoot, "data/shared"),
  imagesRoot: resolve(siteRoot, "images"),
  publicRoot: resolve(siteRoot, "public"),
  publishedOutputDir: resolve(siteRoot, "dist-publish"),
  imageBaseUrl: "http://localhost:3000/images/",
};

export function plugins({ appRoot, r2, siteConfig }) {
  const backendProviders = createFilesystemBackendProviders({
    appRoot,
    siteConfig,
    r2,
  });

  return [
    createOwbBackendPlugin({ appRoot, siteConfig, backendProviders }),
    createOwbImagePlugin({ imageBaseUrl: siteConfig.imageBaseUrl }),
  ];
}
```

## Configure publishing

Create `scripts/publish.mjs`:

```js
import { resolve } from "node:path";
import {
  createFilesystemPublishProvider,
  loadSiteConfig,
  publishSite,
} from "open-website-builder";

const siteRoot = process.cwd();
const siteConfig = await loadSiteConfig(resolve(siteRoot, "owb.config.js"));
const publishProvider = createFilesystemPublishProvider({
  contentRoot: siteConfig.contentRoot,
  pagesRoot: siteConfig.pagesRoot,
  collectionsRoot: siteConfig.collectionsRoot,
  sharedRoot: siteConfig.sharedRoot,
  imagesRoot: siteConfig.imagesRoot,
  publicRoot: siteConfig.publicRoot,
});

const result = await publishSite({
  publishProvider,
  outputDir: siteConfig.publishedOutputDir,
  appRoot: resolve(siteRoot, "node_modules/open-website-builder"),
});

console.log(`Published ${result.pages.length} output(s)`);
```

Run `npm run publish`, then `npm run dev` and open
`http://localhost:3000/editor`.

## Collections

Each collection is a directory containing `_config.json` and one JSON file per
item:

```text
data/collections/posts/
├── _config.json
└── first-post.json
```

Example `_config.json`:

```json
{
  "id": "posts",
  "title": "Posts",
  "fields": {
    "title": { "type": "string", "required": true },
    "content": { "type": "array", "required": true }
  },
  "content": [],
  "collectionMetadataAllowlist": []
}
```

Example `first-post.json`:

```json
{
  "id": "first-post",
  "title": "My first post",
  "url": "/posts/first-post",
  "content": []
}
```

Shared components are individual JSON documents in `data/shared/`. Images are
stored under `images/`; files in `public/` are copied to the root of every
published build.
