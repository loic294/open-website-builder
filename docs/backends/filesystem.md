# Filesystem backend

The filesystem backend stores pages, collections, and shared components as
JSON. It is a good default when content should be readable in pull requests and
versioned with the rest of the website.

Complete the [project setup](/getting-started) first.

See the complete
[filesystem example repository](https://github.com/loic294/owb-file-example)
for a working website with this backend.

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
  appRoot: siteConfig.packageRoot,
});

console.log(`Published ${result.pages.length} output(s)`);
```

Run `npm run generate`, then `npm run dev` and open
`http://localhost:3000/editor`.

## Repository synchronization

When `contentRoot` is inside a Git repository, the editor checks its upstream
branch when it opens and every five minutes. A notice appears when origin has
newer commits, and the sidebar repository panel provides Refresh, Pull, and
Commit & Push actions.

Pull stashes tracked and untracked changes, performs a fast-forward-only pull,
then reapplies the stash. If reapplying creates conflicts, the files remain in
Git's conflict state for manual resolution and the editor shows the complete
command output. A successful pull refreshes the editor content without
reloading the browser.

Commit & Push stages every repository change, creates a timestamped commit when
needed, and pushes the current branch to its configured upstream. It never
force pushes. Configure the branch upstream before using these actions:

```bash
git push --set-upstream origin main
```

OWB uses the credentials already configured for Git. It does not store tokens,
SSH keys, or remote credentials. Git command failures can be inspected from the
repository panel.

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
