# Open Website Builder

A visual website editor built with [Lit](https://lit.dev/), TypeScript, and Vite. Content is stored as plain JSON files in a sibling directory on your machine.

## Setup

### 1. Create a content directory

The editor reads and writes content from a directory called `my-personal-website` located **one level above** this repository:

```
parent-folder/
├── open-website-builder/   ← this repo
└── my-personal-website/    ← your content directory
```

Create the content directory and the required subdirectories:

```bash
mkdir -p ../my-personal-website/pages
mkdir -p ../my-personal-website/collections
mkdir -p ../my-personal-website/shared
```

### 2. Add a starter page

Create `../my-personal-website/pages/home.json`:

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

Create `../my-personal-website/collections/blog/_config.json`:

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

`../my-personal-website/collections/blog/my-first-post.json`:

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

Create `../my-personal-website/shared/header.json`:

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

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server (editor + preview) |
| `npm run build` | Build the editor for production |
| `npm run publish` | Generate the static published site into `dist-publish/` |

## Publishing

`dist-publish/` is generated output — never edit it directly.

- Update source files in `src/website/` or `server/publish/`.
- Run `npm run publish` to regenerate the published output.

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
├── dist-publish/       ← generated published site (do not edit)
├── vite.config.js
└── package.json
```
