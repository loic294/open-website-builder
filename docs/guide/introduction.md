# Introduction

Open Website Builder (OWB) is a visual editor and static publishing toolkit. It
is installed into a separate website project rather than hosting that project
inside a vendor platform.

The website owns its content, site configuration, backend choice, assets, and
generated output. OWB provides the editor, backend contracts, built-in storage
adapters, components, and publishing pipeline.

## Why an open website builder?

Closed website builders are convenient, but they usually keep the editor,
content model, hosting, and publishing pipeline inside one vendor's platform.
That can make a future migration depend on incomplete exports, recreated
templates, or a continuing subscription.

Open Website Builder keeps those responsibilities under your control:

- **You own the content.** Pages can be ordinary JSON files, a SQLite database,
  or records in a backend you implement.
- **You own the output.** Publishing produces a static site that can be hosted
  anywhere instead of requiring a proprietary runtime.
- **You can inspect and extend the editor.** The editor, components, backend
  adapters, and publish pipeline are source code rather than fixed product
  boundaries.
- **You choose the infrastructure.** Move between local files, a database,
  object storage, and hosting providers without replacing the editing model.
- **Your site remains portable.** Content and generated assets can be backed up,
  versioned, tested, and deployed with standard development tools.

This flexibility comes with responsibility: you operate the project, choose a
host, apply updates, and protect any custom backend. A hosted closed platform
may remain the better choice when a team wants those operational decisions
handled by a vendor. OWB is intended for people who value ownership,
portability, and the ability to change the system itself.

## How it fits together

During development, Vite serves the editor and mounts backend middleware under
`/__data`. The editor reads and writes complete content documents through that
API. A publish provider reads the same documents and produces static output.

Choose the storage model that suits the project:

- [Filesystem backend](/backends/filesystem): JSON content that is easy to inspect, version, and deploy with Git.
- [SQLite backend](/backends/sqlite): transactional local storage in one database file.
- [Custom backend](/backends/custom): connect services such as PostgreSQL, a CMS, or custom object storage.

Continue with [Getting started](/getting-started), then follow one of the backend
guides and the [editor tour](/editor/).