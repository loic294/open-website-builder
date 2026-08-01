# Comparing website-building approaches

Open Website Builder combines a visual editor with user-controlled content and
static output. It overlaps with hosted builders, static site generators, and
headless CMS products, but it makes different tradeoffs.

## At a glance

| Approach                | Visual editing             | Content ownership                  | Hosting choice            | Maintenance                  |
| ----------------------- | -------------------------- | ---------------------------------- | ------------------------- | ---------------------------- |
| Open Website Builder    | Built in                   | Files, SQLite, or custom backend   | Any static host           | You operate and update it    |
| Squarespace or Wix      | Built in and polished      | Vendor-managed with export options | Primarily vendor platform | Vendor-managed               |
| Static site generator   | Usually developer-oriented | Source files or external data      | Any static host           | You operate the toolchain    |
| Headless CMS + frontend | CMS editing UI             | CMS-managed through APIs           | Usually flexible          | You integrate two systems    |
| Hand-coded site         | Depends on tools added     | Fully controlled                   | Fully flexible            | Entirely your responsibility |

## Squarespace and Wix

Hosted builders are usually the fastest route for a person who wants templates,
commerce, forms, domains, analytics, support, and hosting managed together.
Their editors and operational tooling are mature because the vendor controls
the complete platform.

OWB is a better fit when portability and extensibility matter more than a
turnkey service. Content can live in a repository or database you control, the
editor source can be changed, and the published site can move between hosts.
The cost is that you must choose hosting, manage deployments, apply updates,
and implement features that a hosted subscription may include.

Exports from hosted builders vary by feature and do not always reproduce the
original design or dynamic services. Evaluate the current export support for
the exact pages, products, memberships, forms, and media a site uses before
choosing a platform.

## Static site generators

Tools such as Astro, Eleventy, Hugo, and Jekyll are strong choices for
developer-authored sites. They typically offer mature template ecosystems,
Markdown workflows, data loading, and build-time integrations.

OWB adds an integrated visual editor and a component document model. Choose it
when non-code editing and direct manipulation are central requirements. Choose
a conventional static generator when authors are comfortable with Markdown or
a separate CMS, or when its framework and plugin ecosystem already solve the
project well.

OWB itself publishes static output, so both approaches share inexpensive
hosting, CDN compatibility, and a small production attack surface.

## Headless CMS and visual frontends

A headless CMS provides structured content, APIs, roles, workflows, and often
media management. A separate frontend renders that content. This is a good fit
for organizations distributing the same content to websites, apps, and other
channels.

OWB's filesystem and SQLite backends are simpler and keep page composition near
the website. Its [custom backend contract](/backends/custom) can connect a CMS
or internal API when centralized workflows are required, but that integration
is engineering work rather than a built-in vendor connector.

## Dynamic application frameworks

Next.js, Nuxt, Rails, Laravel, and similar frameworks are designed for dynamic
applications as well as content sites. Prefer an application framework when
the public experience requires authenticated sessions, per-request data,
transactions, or server-rendered personalization.

OWB is strongest when the public website can be generated ahead of time. Forms
and other dynamic features can call external APIs or serverless functions, but
the published output is not itself an application server.

## Decision questions

Choose OWB when most answers are yes:

- Must the content and generated site remain portable?
- Is static public output appropriate?
- Does the team need visual editing without adopting a closed hosting stack?
- Is someone available to own deployment, updates, backups, and security?
- Will access to the source and backend contract reduce long-term constraints?

Choose a hosted builder when speed, bundled operations, and vendor support are
more important than infrastructure choice. Choose a conventional static
generator when code or Markdown is the preferred authoring interface. Choose a
headless CMS or application framework when workflow or runtime requirements are
larger than the website editor itself.
