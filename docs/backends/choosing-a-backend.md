# Choosing a backend

The backend controls where editable content and image metadata live. It does
not determine where the published static site must be hosted.

## Quick recommendation

| Need | Recommended backend |
| --- | --- |
| Small site, content reviewed in Git | Filesystem |
| Portable local database and transactional writes | SQLite |
| Existing CMS, database, authentication, or multiple editors | Custom |
| Prototype without persistence | In-memory |

Start with the [filesystem backend](/backends/filesystem) unless you already
have a reason to operate a database. It has the fewest moving parts and keeps
every content change visible in version control.

## Filesystem

Choose the filesystem backend when:

- Content should be reviewed through commits and pull requests.
- A single editor or a coordinated team makes changes.
- Backups and rollbacks should use normal Git workflows.
- The deployment environment can read and write the project content directory.

Pages, collection items, collection configuration, and shared components are
individual JSON files. Merge conflicts are possible when two people edit the
same document simultaneously. A remotely hosted editor also needs durable
writable storage; an ephemeral serverless filesystem is not sufficient.

## SQLite

Choose SQLite when:

- You want atomic writes without operating a database server.
- Content should remain in one portable database file.
- The editor runs on a persistent machine, container volume, or mounted disk.
- Concurrent writes are modest and handled by one application instance.

SQLite stores content documents, image metadata, and image folders. Image
binaries and public files remain outside the database. Back up the database
together with its `-wal` and `-shm` files, or use SQLite's backup facilities.

SQLite is not a good fit for independent serverless instances writing to their
own local copies. Use a network database or a durable SQLite platform through a
custom backend in that architecture.

## Custom backend

Choose a custom backend when:

- The organization already uses PostgreSQL, a CMS, or an internal content API.
- Multiple editors need authentication, authorization, or an audit trail.
- Content must be shared by several applications.
- The editor and publisher run on stateless infrastructure.
- Assets belong in an existing object-storage or media service.

This option has the highest implementation and operational cost. You must
implement the editor data contract, asset operations, publishing reads,
validation, and access control. See the [custom backend guide](/backends/custom)
for payloads and reference implementations.

## In-memory backend

The in-memory provider is useful for tests, demos, and integration development.
All changes disappear when the process exits, so it is not a production content
store.

## Content storage and hosting are separate

All backends can publish the same static output to `dist-publish/`. That output
can be deployed to Cloudflare Pages, Netlify, GitHub Pages, Vercel, AWS, or any
server that can host static files. Only the build environment needs access to
the selected backend.

For a remote custom backend, store credentials in the hosting provider's build
environment. Never expose them through browser-side Vite variables.