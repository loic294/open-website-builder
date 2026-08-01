# Publishing and hosting

OWB separates content editing from public hosting. Publishing reads the chosen
backend and generates ordinary HTML, CSS, JavaScript, images, `robots.txt`, and
`sitemap.xml` in `dist-publish/`.

## Prepare for production

Set `siteUrl` in `config.json` to the final HTTPS origin before publishing:

```json
{
  "siteUrl": "https://www.example.com",
  "pageTitle": "Example",
  "analyticsScript": ""
}
```

OWB uses this value for canonical links, Open Graph URLs, and the sitemap. Do
not include a trailing slash.

Generate and inspect the site locally:

```bash
npm ci
npm run generate
npx serve dist-publish
```

Check several page URLs, images, `robots.txt`, and `sitemap.xml`. Never edit
`dist-publish/` directly because the next publish replaces generated files.

## Publish from the editor

**Save Changes** generates the static site locally. **Publish** runs the enabled
deployment actions without generating the site again. By default, it runs the
project's `upload` npm script from the project root and, with the filesystem
backend, commits and pushes the repository.

Configure either action independently in `owb.config.js`:

```js
export const owbConfig = {
  // Other paths and settings...
  uploadScript: false,
  pushToGit: true,
};
```

Set `uploadScript` to an npm script name to enable uploads, or `false` to skip
them. The script must exist in the project's `package.json`. OWB runs
`npm run <uploadScript>` without a shell and shows its command output when it
fails.

Set `pushToGit` to `true` to run the same Commit & Push operation available in
the repository panel, or `false` to skip it. This action is available only with
the filesystem backend. When both actions are enabled, upload runs before Git.
A failure stops Publish and identifies the failed action. SQLite and in-memory
backends ignore `pushToGit`.

## Build settings

Most Git-integrated static hosts need the same values:

| Setting          | Value                  |
| ---------------- | ---------------------- |
| Runtime          | Node.js 22.13 or newer |
| Install command  | `npm ci`               |
| Build command    | `npm run generate`     |
| Output directory | `dist-publish`         |

If the website is inside a monorepo, set the provider's root or base directory
to the website project. The build must be able to install
`open-website-builder`; a local `file:../open-website-builder` dependency only
works when that adjacent package is also present in the checkout.

The build also needs access to content:

- Filesystem content must be committed or downloaded before `npm run generate`.
- A SQLite database must be committed, restored from backup, or downloaded to
  the configured path. Do not expect writes made on an ephemeral build machine
  to persist after deployment.
- A custom backend must be reachable from the build runner; provide its secrets
  through the hosting platform's encrypted environment settings.

## Root-path requirement

Published pages currently reference assets and routes from `/`. Deploy at a
domain or subdomain root, such as `https://example.com/` or
`https://site.pages.dev/`.

Do not deploy unchanged output under a path such as
`https://example.com/my-site/`. This matters most for GitHub Pages project sites.
Use a custom domain, an account-level Pages site, or a host that assigns the
deployment its own root domain.

## Choose a host

- [Cloudflare Pages](/publishing/cloudflare-pages): Git deployments, previews, and a global edge network.
- [Netlify](/publishing/netlify): Git deployments with file-based build configuration and deploy previews.
- [GitHub Pages](/publishing/github-pages): GitHub Actions deployment for public static output.
- [Vercel](/publishing/vercel): Git deployments with a custom output directory.
- [AWS and other static hosts](/publishing/other-hosts): S3/CloudFront, Amplify, object storage, and conventional web servers.

Hosting serves the generated site only. The `/editor` development route and
`/__data` APIs are not part of `dist-publish/`. Run the editor separately and
protect it if non-developers need remote access.
