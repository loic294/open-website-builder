# GitHub Pages

GitHub Pages can deploy `dist-publish/` through GitHub Actions. OWB currently
uses root-relative assets, so prefer one of these URL forms:

- `https://username.github.io/` from the `username.github.io` repository.
- A custom domain attached to any Pages repository.

A project site at `https://username.github.io/repository/` will not work
unchanged because requests such as `/theme.css` resolve outside the repository
subpath.

## Configure Pages

In the repository settings, open **Pages** and select **GitHub Actions** as the
source. Set `config.json.siteUrl` to the account Pages URL or custom domain.

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy website

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22.13
          cache: npm
      - run: npm ci
      - run: npm run generate
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist-publish

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

For a monorepo, either set `defaults.run.working-directory` for shell steps or
prefix commands and artifact paths with the website directory. GitHub action
steps such as `uses: actions/upload-pages-artifact` do not inherit shell working
directories.

Store custom backend credentials as GitHub Actions secrets and pass only the
required values to the build step.

See [GitHub's custom Pages workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
