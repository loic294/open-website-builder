# Cloudflare Pages

Cloudflare Pages can build an OWB site from GitHub or GitLab and deploy the
generated directory to a `pages.dev` domain or custom domain.

## Git integration

1. Push the website project to GitHub or GitLab.
2. In Cloudflare, open **Workers & Pages**, select **Create application**, then
   **Pages** and **Connect to Git**.
3. Select the repository and production branch.
4. Use these build settings:

| Setting                | Value                                                      |
| ---------------------- | ---------------------------------------------------------- |
| Framework preset       | None                                                       |
| Build command          | `npm run generate`                                         |
| Build output directory | `dist-publish`                                             |
| Root directory         | Website directory, or blank when it is the repository root |

Set `NODE_VERSION` to a Node.js release compatible with OWB, currently 22.13 or
newer. Add custom backend credentials as encrypted environment variables.

Cloudflare creates preview deployments for non-production branches. Keep
`config.json.siteUrl` set to the production domain so preview builds do not
replace canonical URLs with temporary preview URLs.

## Direct deployment

For a CI workflow that publishes before upload:

```bash
npm ci
npm run generate
npx wrangler pages deploy dist-publish --project-name=my-website
```

Authenticate Wrangler with Cloudflare's CI environment variables. Do not commit
API tokens.

## Custom domain

Add the domain in the Pages project's **Custom domains** settings, wait for DNS
and TLS provisioning, then update `config.json.siteUrl` and redeploy.

Cloudflare distinguishes Git-integrated and direct-upload projects. Choose the
workflow you intend to keep when creating the project.

See [Cloudflare's Git integration guide](https://developers.cloudflare.com/pages/get-started/git-integration/).
