# SQLite backend

The SQLite backend stores pages, collections, collection items, shared
components, image metadata, and image folders in a local database. Image
binaries, `config.json`, `public/`, and generated output remain ordinary files.

SQLite support requires Node.js 22.13 or newer. Complete the
[project setup](/getting-started) first.

See the complete
[SQLite example repository](https://github.com/loic294/owb-sqlite-example)
for a working website with this backend.

## Configure the editor backend

Create `owb.config.js`:

```js
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createOwbBackendPlugin,
  createOwbImagePlugin,
  createSqliteBackendProviders,
} from "open-website-builder";

const siteRoot = dirname(fileURLToPath(import.meta.url));

export const owbConfig = {
  contentRoot: siteRoot,
  sqliteDbPath: resolve(siteRoot, "data/site.sqlite"),
  imagesRoot: resolve(siteRoot, "images"),
  publicRoot: resolve(siteRoot, "public"),
  publishedOutputDir: resolve(siteRoot, "dist-publish"),
  imageBaseUrl: "http://localhost:3000/images/",
};

export function plugins({ appRoot, r2, siteConfig }) {
  const backendProviders = createSqliteBackendProviders({
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

The database and its schema are created when the provider first opens it. Start
the editor and create the first page at `http://localhost:3000/editor`, or seed
content programmatically with `openSqliteDatabase`:

```js
import { openSqliteDatabase } from "open-website-builder";

const database = openSqliteDatabase("./data/site.sqlite");
const page = {
  type: "page",
  id: "home",
  title: "Home",
  url: "/",
  content: [],
};

database
  .prepare("INSERT INTO pages (id, document) VALUES (?, ?)")
  .run(page.id, JSON.stringify(page));
database.close();
```

## Configure publishing

Create `scripts/publish.mjs`:

```js
import { resolve } from "node:path";
import {
  createSqlitePublishProvider,
  loadSiteConfig,
  openSqliteDatabase,
  publishSite,
} from "open-website-builder";

const siteRoot = process.cwd();
const siteConfig = await loadSiteConfig(resolve(siteRoot, "owb.config.js"));
const database = openSqliteDatabase(siteConfig.sqliteDbPath);

try {
  const publishProvider = createSqlitePublishProvider({
    database,
    contentRoot: siteConfig.contentRoot,
    imagesRoot: siteConfig.imagesRoot,
    publicRoot: siteConfig.publicRoot,
  });
  const result = await publishSite({
    publishProvider,
    outputDir: siteConfig.publishedOutputDir,
    appRoot: resolve(siteRoot, "node_modules/open-website-builder"),
  });
  console.log(`Published ${result.pages.length} output(s)`);
} finally {
  database.close();
}
```

Run `npm run generate` whenever content changes. Do not open the database with a
Node.js version older than the one used to create it. Squarespace imports are
not currently supported by the SQLite provider.
