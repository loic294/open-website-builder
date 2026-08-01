# Assets and publishing

## Manage images

Open **File Manager** from the bottom of the sidebar. It supports folders,
multiple uploads, image selection, renaming, deletion, and descriptions.

Use folders to keep large libraries navigable. Add meaningful descriptions for
editorial context and accessibility workflows. Renaming an image changes its
stored path, so update content that references the old path.

Image blocks, galleries, sliders, metadata image fields, and SEO social images
open File Manager in a selection mode appropriate to that control.

With the built-in backends, image metadata and folders follow the selected
backend while image binaries are served from the configured image store. Files
inside `public/` bypass the image manager and are copied directly to the root of
the published site.

## Preview responsive layouts

Use the desktop, tablet, and mobile controls in the toolbar to change the
editing canvas. Tablet and mobile modes support horizontal and vertical
orientation. Responsive component settings are stored separately for each
viewport bucket when the component exposes them.

Check both orientations after changing grids, fixed heights, spacing, or long
text. **Preview** displays the published route without editor controls, but it
still depends on a recent publish.

## Publish the site

Select **Save Changes** to invoke the backend's publish operation from the
editor. For a terminal or CI deployment, run:

```bash
npm run publish
```

The publish provider reads site configuration, pages, shared components,
collection templates, collection items, images, and public files. It writes a
static site to `dist-publish/` by default.

Do not edit `dist-publish/` directly. Regenerate it from the source content and
deploy that directory to the static host. For a custom backend, publish from a
trusted Node.js process so database and object-store credentials never reach
the browser.

Continue with [Publishing and hosting](/publishing/) for Cloudflare Pages,
Netlify, GitHub Pages, Vercel, and AWS deployment examples.