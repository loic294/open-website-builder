# Run with Docker Compose

The prebuilt Docker image contains Node.js 22, Git, OpenSSH, the OWB editor,
and its Linux dependencies. GitHub Actions builds it from the included
`Dockerfile` for amd64 and arm64, then publishes it to GitHub Container
Registry. Your website remains outside the image and is mounted at `/workspace`,
so editor changes and generated output persist on the host.

The editor frontend is built into the image and served as static files. The
container does not run Vite's development watcher or HMR server. Backend API
middleware remains active for editing content, repository operations, image
uploads, and publishing.

## Project layout

The included `docker-compose.yml` defaults to the repository's sibling
`my-personal-website` project:

```text
open-website-builder/
├── open-website-builder/
│   ├── Dockerfile
│   └── docker-compose.yml
└── my-personal-website/
    ├── package.json
    ├── package-lock.json
    ├── owb.config.js
    └── data/
```

Set `OWB_PROJECT_PATH` to use another website. Relative paths are resolved
from the directory containing `docker-compose.yml`.

## SSH access to GitHub

The filesystem backend's repository status, Pull, Commit & Push, and the Git
step after Publish run inside the container. The Compose file mounts the host's
`${HOME}/.ssh` directory read-only at `/run/host-ssh`. At startup, the
entrypoint copies regular files into the container user's ephemeral
`/home/node/.ssh`, removes links and special files, and applies OpenSSH's strict
ownership and permissions. Root exec shells use the same copied directory.
The host SSH directory is never modified.

Before starting the container:

1. Configure the website repository with an SSH remote such as
   `git@github.com:owner/repository.git`.
2. Ensure `${HOME}/.ssh` contains the private key, its public key, and any SSH
   config required for that remote.
3. Ensure `known_hosts` contains GitHub's verified host key. Obtain the
   fingerprint from GitHub's published documentation and verify it before
   adding it. Host-key verification is not disabled by this setup.

Set the commit identity in your shell or a Compose `.env` file. Both values
must be provided together:

```dotenv
GIT_USER_NAME=Your Name
GIT_USER_EMAIL=you@example.com
```

The entrypoint writes this identity to the container's system Git
configuration, so it is available to both the editor process and root exec
shells. It does not modify the host Git configuration.

Do not put private keys, tokens, or credentials in the Dockerfile, Compose
environment, or image build context.

## Start the editor

From the `open-website-builder` package directory, pull and start the image:

```bash
HOST_UID=$(id -u) HOST_GID=$(id -g) docker compose up
```

On Docker Desktop for macOS, the default UID and GID usually also work:

```bash
docker compose up
```

Open `http://localhost:3003/editor/`. The first startup installs the mounted
website's Linux dependencies into a named volume. Later startups reuse that
volume unless `package-lock.json` (or `package.json` when no lockfile exists)
changes. The image then links its baked OWB package into the website's
`node_modules` before starting the website's normal `npm run dev` script.

To mount a different website:

```bash
OWB_PROJECT_PATH=../owb-file-example \
HOST_UID=$(id -u) HOST_GID=$(id -g) \
docker compose up
```

Set `OWB_IMAGE` to use a specific published tag or another registry:

```bash
OWB_IMAGE=ghcr.io/loic294/open-website-builder:0.1.7 docker compose up
```

The mounted project must provide `package.json`, `vite.config.js`, and
`owb.config.js`. `OWB_SITE_CONFIG` defaults to `./owb.config.js`.

## Publishing with the filesystem backend

Before a Docker filesystem publish that pushes to Git, OWB compares the
version baked into the editor image with the mounted project's
`dependencies["open-website-builder"]`. If they differ, OWB preserves an
existing exact, caret, or tilde range, updates the dependency, and runs
`HUSKY=0 npm i` so `package-lock.json` and the dependency volume are current.

OWB creates a local commit containing only `package.json` and
`package-lock.json` before running the configured upload script. The normal Git
step then commits any remaining website changes and pushes both commits. If the
dependency update, installation, or dependency commit fails, upload and push
do not run. Matching versions do not run npm or create a dependency commit.

## Filesystem and SQLite backends

For the filesystem backend, mount the repository root so `/workspace` includes
its `.git` directory. Git commands use the mounted repository and the copied
SSH credentials. The entrypoint configures only `/workspace` as a system-level
Git `safe.directory`, so Git also works from a root `docker compose exec` shell
when bind-mount ownership differs. It does not configure `safe.directory=*` or
mutate host Git configuration.

For the SQLite backend, set `sqliteDbPath` to a path inside the website project,
such as `data/site.sqlite`. The bind mount persists the database, journals,
images, configuration, and generated output. Git and SSH are present but the
SQLite provider does not expose repository actions.

## Dependency volume

The named volume keeps Linux-native dependencies such as Sharp separate from
the host's `node_modules`. To force a clean project dependency installation:

```bash
docker compose down --volumes
docker compose up
```

## Useful commands

Generate the static site without uploading it:

```bash
docker compose exec editor npm run generate
```

Check Git and SSH from the same runtime used by the editor:

```bash
docker compose exec editor git status
docker compose exec editor git ls-remote origin
```

Stop the editor while retaining project dependencies:

```bash
docker compose down
```
