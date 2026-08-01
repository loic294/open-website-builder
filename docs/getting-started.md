# Getting started

This guide creates a standalone website project that consumes Open Website
Builder. You need [Node.js](https://nodejs.org/) 22.13 or newer and npm.

## Create the project

```bash
mkdir my-website
cd my-website
npm init -y
npm install open-website-builder vite@^5
mkdir -p data images public scripts
```

When developing OWB and a site in adjacent directories, install the local
checkout instead:

```bash
npm install ../open-website-builder
```

Set the project to use ES modules and add the common commands:

```json
{
  "name": "my-website",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.13.0"
  },
  "scripts": {
    "dev": "OWB_SITE_CONFIG=./owb.config.js vite",
    "build": "OWB_SITE_CONFIG=./owb.config.js vite build",
    "generate": "node ./scripts/publish.mjs"
  },
  "dependencies": {
    "open-website-builder": "^0.1.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

Keep the dependency value written by `npm install` if it differs from the
example above.

## Add the site configuration

Create `config.json`. This configuration is included in the published site:

```json
{
  "siteUrl": "http://localhost:3000",
  "pageTitle": "My website",
  "analyticsScript": ""
}
```

Create `vite.config.js`:

```js
import { defineConfig } from "vite";
import owbViteConfig from "open-website-builder/vite.config.js";

export default defineConfig(async (environment) => {
  const config = await owbViteConfig(environment);

  return {
    ...config,
    server: {
      ...(config.server || {}),
      port: 3000,
      strictPort: true,
    },
  };
});
```

The `OWB_SITE_CONFIG` environment variable tells OWB where to load the site's
`owb.config.js` file. The exact contents of that file depend on your backend:

- Continue with [Filesystem backend](/backends/filesystem) for JSON files.
- Continue with [SQLite backend](/backends/sqlite) for a local database.
- Read [Custom backend](/backends/custom) to integrate another store.

## Option 1: Run with Node.js and npm

After completing a backend guide:

```bash
npm run dev
```

Open `http://localhost:3000/editor` for the editor. The root URL previews the
last published version, so run the first publish in another terminal:

```bash
npm run generate
```

The generated static site is written to `dist-publish/`. Treat that directory
as build output and deploy it to any static hosting service.

## Option 2: Run with Docker Compose

As an alternative to running Node.js directly on the host, follow the
[Docker Compose guide](/docker-compose). It includes separate configurations
for filesystem and SQLite websites.

## Project layout

```text
my-website/
├── config.json
├── owb.config.js
├── package.json
├── vite.config.js
├── data/
├── images/
├── public/
├── scripts/
│   └── publish.mjs
└── dist-publish/       # generated
```
