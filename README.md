# Open Website Builder

A visual website editor built with [Lit](https://lit.dev/) and Vite. The package exports the editor runtime, publish pipeline, and plugin factories; the website repo owns the site config and composes those exports.

## Setup

### 1. Create a site config

The website repo owns `owb.config.js`. That config sets `contentRoot`, `publishedOutputDir`, `imageBaseUrl`, and the plugin list used by the editor package.

```
my-personal-website/
├── owb.config.js
├── package.json
├── pages/
├── collections/
└── shared/
```

Create the content directory and the required subdirectories in the website repo:

```bash
mkdir -p pages
mkdir -p collections
mkdir -p shared
```

### 2. Add a starter page

Create `pages/home.json`:

```json
{
  "type": "page",
  "id": "home",
  "title": "Home",
  "url": "/",
  "content": [
    {
      "id": "section-default",
      "type": "section",
      "content": [],
      "settings": {}
    }
  ]
}
```

### 3. (Optional) Add a collection

Collections are subdirectories inside `collections/`. Each one requires a `_config.json` file.

Create `collections/blog/_config.json`:

```json
{
  "id": "blog",
  "title": "Blog",
  "fields": {
    "title": { "type": "string", "required": true },
    "content": { "type": "array", "required": true },
    "metadata": { "type": "object", "required": false }
  },
  "content": [
    {
      "id": "section-collection-template",
      "type": "section",
      "content": [],
      "settings": {}
    }
  ],
  "collectionMetadataAllowlist": []
}
```

Collection items are individual JSON files inside the collection directory:

`collections/blog/my-first-post.json`:

```json
{
  "id": "my-first-post",
  "title": "My First Post",
  "content": [
    {
      "id": "section-default",
      "type": "section",
      "content": [],
      "settings": {}
    }
  ]
}
```

### 4. (Optional) Add a shared component

Shared components are reusable blocks stored as JSON files in the `shared/` directory.

Create `shared/header.json`:

```json
{
  "id": "header",
  "title": "Header",
  "content": [
    {
      "id": "section-header",
      "type": "section",
      "content": [],
      "settings": {}
    }
  ]
}
```

### Resulting content directory structure

```
my-personal-website/
├── pages/
│   └── home.json
├── collections/
│   └── blog/
│       ├── _config.json
│       └── my-first-post.json
└── shared/
    └── header.json
```

### 5. Install dependencies and start the editor

```bash
npm install
npm run dev
```

Open [http://localhost:3003/editor](http://localhost:3003/editor) to start editing.

To launch from the website repo directly, run its local `npm run dev`. That repo re-exports the package Vite config and points `OWB_SITE_CONFIG` at its own config file.

## Scripts

| Command           | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `npm run dev`     | Start the development server (editor + preview)         |
| `npm run build`   | Build the editor for production                         |
| `npm run publish` | Generate the static published site into `dist-publish/` |

## Publishing

`my-personal-website/dist-publish/` is generated output — never edit it directly.

- Update source files in `src/website/`, `src/plugins/`, or `server/publish/`.
- Run `npm run publish` to regenerate the published output.

### Working From the Website Repo

The website repo installs `open-website-builder` as a local file dependency and owns `owb.config.js`. Edit that config when changing content paths, the image base URL, or the plugin stack. The package reads the config path from `OWB_SITE_CONFIG`.

## Project Structure

```
open-website-builder/
├── src/
│   ├── editor/         ← editor UI components
│   └── website/        ← website rendering components
├── server/
│   ├── data/           ← JSON data resolvers and API middleware
│   ├── import/         ← Squarespace import utilities
│   └── publish/        ← static site publish pipeline
├── editor/             ← editor HTML entry points
├── vite.config.js
└── package.json
```
