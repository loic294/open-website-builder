import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Open Website Builder",
  description:
    "A backend-agnostic visual website editor and static publishing toolkit.",
  base: "/open-website-builder/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/introduction" },
      { text: "Editor", link: "/editor/" },
      { text: "Backends", link: "/backends/choosing-a-backend" },
      { text: "Publishing", link: "/publishing/" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Introduction", link: "/guide/introduction" },
          { text: "Getting started", link: "/getting-started" },
          { text: "Docker Compose", link: "/docker-compose" },
          { text: "Comparison", link: "/guide/comparison" },
          { text: "Licensing", link: "/guide/licensing" },
        ],
      },
      {
        text: "Editor",
        items: [
          { text: "Using the editor", link: "/editor/" },
          { text: "Pages", link: "/editor/pages" },
          { text: "Collections", link: "/editor/collections" },
          {
            text: "Shared components",
            link: "/editor/shared-components",
          },
          {
            text: "Assets and publishing",
            link: "/editor/assets-and-publishing",
          },
        ],
      },
      {
        text: "Backends",
        items: [
          { text: "Choosing a backend", link: "/backends/choosing-a-backend" },
          { text: "Filesystem", link: "/backends/filesystem" },
          { text: "SQLite", link: "/backends/sqlite" },
          { text: "Custom backend", link: "/backends/custom" },
        ],
      },
      {
        text: "Publishing",
        items: [
          { text: "Overview", link: "/publishing/" },
          { text: "Cloudflare Pages", link: "/publishing/cloudflare-pages" },
          { text: "Netlify", link: "/publishing/netlify" },
          { text: "GitHub Pages", link: "/publishing/github-pages" },
          { text: "Vercel", link: "/publishing/vercel" },
          { text: "AWS and other hosts", link: "/publishing/other-hosts" },
        ],
      },
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/loic294/open-website-builder",
      },
    ],

    search: { provider: "local" },
    outline: { level: [2, 3] },
  },
});
