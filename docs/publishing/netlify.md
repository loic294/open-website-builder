# Netlify

Netlify can run the publish command on every push and serve `dist-publish/` from
its CDN.

## Dashboard setup

Import the Git repository and configure:

| Setting           | Value                                          |
| ----------------- | ---------------------------------------------- |
| Base directory    | Website directory, or blank at repository root |
| Build command     | `npm run generate`                             |
| Publish directory | `dist-publish`                                 |

Select Node.js 22.13 or newer and add custom backend credentials through
Netlify's environment-variable settings.

## File-based configuration

Create `netlify.toml` at the website project root:

```toml
[build]
  command = "npm run generate"
  publish = "dist-publish"

[build.environment]
  NODE_VERSION = "22.13.0"
```

Settings in `netlify.toml` override conflicting dashboard build settings. Keep
secrets in the Netlify UI rather than this file.

Netlify Deploy Previews use temporary domains. Keep `config.json.siteUrl` set to
the production origin unless preview pages should deliberately advertise a
different canonical URL.

## CLI deployment

After linking the project with the Netlify CLI:

```bash
npm ci
npm run generate
npx netlify deploy --dir=dist-publish
npx netlify deploy --dir=dist-publish --prod
```

The first deploy command creates a preview; the second deploys production.

See [Netlify's file-based configuration reference](https://docs.netlify.com/build/configure-builds/file-based-configuration/).
