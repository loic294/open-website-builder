# Vercel

Vercel can deploy OWB as a framework-independent static project.

## Dashboard setup

Import the Git repository, choose **Other** as the framework preset, and set:

| Setting          | Value                                    |
| ---------------- | ---------------------------------------- |
| Root directory   | Website directory, or repository root    |
| Build command    | `npm run generate`                       |
| Output directory | `dist-publish`                           |
| Node.js version  | A release compatible with Node.js 22.13+ |

Add custom backend credentials in the project's environment-variable settings.
Set `config.json.siteUrl` to the production Vercel domain or custom domain.

## Project configuration

The equivalent `vercel.json` is:

```json
{
  "framework": null,
  "buildCommand": "npm run generate",
  "outputDirectory": "dist-publish"
}
```

Vercel creates preview deployments for branches and pull requests. The
production `siteUrl` can remain fixed so canonical metadata always points to
the public site.

## CLI deployment

```bash
npm ci
npm run generate
npx vercel deploy
npx vercel deploy --prod
```

The configured output directory is uploaded. Use the production flag only
after checking a preview deployment.

See [Vercel's build configuration reference](https://vercel.com/docs/deployments/configure-a-build).
