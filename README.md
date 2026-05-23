# Open Website Builder - Lit Project

This is a basic [Lit](https://lit.dev/) starter project using TypeScript and npm.

## Getting Started

### Install dependencies

```
npm install
```

### Start development server

```
npm run dev
```

### Build for production

```
npm run build
```

## Publishing Rules

`dist-publish/` is generated output.

- Never edit files in `dist-publish/` directly.
- Always update source files in `src/website/` or `server/publish/`.
- Regenerate published output with:

```
npm run publish
```

The publish pipeline now rewrites `dist-publish/` on each run and adds a generated-file warning header to published assets.

## Project Structure

- `index.html`: Main HTML file
- `src/main.ts`: Entry point
- `src/MyElement.ts`: Sample Lit component

## Notes

- UI uses solid backgrounds (no glassy/translucent surfaces).
- For more info, see [Lit documentation](https://lit.dev/docs/getting-started/).
