# Run with Docker Compose

Docker Compose can run the Open Website Builder editor without installing
Node.js directly on the host. Complete the shared project setup in
[Getting started](/getting-started), then configure either the
[filesystem backend](/backends/filesystem) or [SQLite backend](/backends/sqlite).

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) or
another Docker environment that includes Compose.

## Option 1: Filesystem backend

Use this option when pages, collections, and shared components are JSON files
under `data/`. Create `compose.yaml` in the website project:

```yaml
services:
  editor:
    image: node:22-bookworm-slim
    working_dir: /workspace
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0"
    ports:
      - "3000:3000"
    volumes:
      - .:/workspace
      - node_modules:/workspace/node_modules
    environment:
      OWB_SITE_CONFIG: ./owb.config.js

volumes:
  node_modules:
```

The project bind mount persists JSON content, images, configuration, and
published output on the host. The named volume keeps Linux-compatible
dependencies out of the host's `node_modules` directory.

The service uses the filesystem backend configured in `owb.config.js`; Compose
does not select the backend. See the
[filesystem example repository](https://github.com/loic294/owb-file-example)
for a complete project.

## Option 2: SQLite backend

Use this option when content and image metadata are stored in a local SQLite
database. Create `compose.yaml` in the website project:

```yaml
services:
  editor:
    image: node:22-bookworm-slim
    working_dir: /workspace
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0"
    ports:
      - "3000:3000"
    volumes:
      - .:/workspace
      - node_modules:/workspace/node_modules
    environment:
      OWB_SITE_CONFIG: ./owb.config.js

volumes:
  node_modules:
```

Set `sqliteDbPath` in `owb.config.js` to a path inside the mounted project, such
as `data/site.sqlite`. The project bind mount then persists the database and
its journal files alongside images, configuration, and published output. Do
not store the database inside the container-only `node_modules` volume.

The Node.js 22 image includes the built-in SQLite support required by OWB. See
the [SQLite example repository](https://github.com/loic294/owb-sqlite-example)
for a complete project.

## Start and stop the editor

Start either configuration from the website project:

```bash
docker compose up
```

The `--host 0.0.0.0` option in the service command makes Vite reachable through
Docker's published port. Open `http://localhost:3000/editor`.

Changes made in the editor are written through the bind mount. Stop the
foreground process with `Ctrl+C`, or stop and remove the container with:

```bash
docker compose down
```

When dependencies change, recreate the dependency volume before starting:

```bash
docker compose down --volumes
docker compose up
```

## Publish from the container

With the editor service running, publish the website in a second terminal:

```bash
docker compose exec editor npm run generate
```

The generated site is written to the project's configured output directory,
normally `dist-publish/`.

## Linux file permissions

Files created by the container may be owned by `root` on Linux. If that is a
problem, add the following setting to the `editor` service and ensure the
project directory and dependency volume are writable by that user:

```yaml
user: "${UID}:${GID}"
```
