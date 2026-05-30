import { LitElement, html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import * as simpleIcons from "simple-icons";

export const defaultSocialMediaConfig = {
  type: "social-media",
  items: [{ id: "social-item-1", name: "Social", link: "", icon: "github" }],
};

export const LEGACY_ICON_VALUE_MAP = {
  twitter: "x",
  linkedin: "linkedin",
  github: "github",
  instagram: "instagram",
  youtube: "youtube",
  facebook: "facebook",
  tiktok: "tiktok",
  globe: "",
  custom: "",
};

export const SIMPLE_ICON_LIBRARY = Object.values(simpleIcons)
  .filter(
    (icon) =>
      icon &&
      typeof icon === "object" &&
      typeof icon.slug === "string" &&
      typeof icon.title === "string" &&
      typeof icon.svg === "string",
  )
  .map((icon) => ({
    slug: icon.slug,
    title: icon.title,
    svg: icon.svg,
    hex: icon.hex,
  }));

export const SIMPLE_ICON_MAP = new Map(
  SIMPLE_ICON_LIBRARY.map((icon) => [icon.slug, icon]),
);

export const FEATURED_ICON_SLUGS = [
  "x", "linkedin", "github", "instagram", "youtube", "facebook",
  "tiktok", "discord", "mastodon", "bluesky", "medium", "reddit",
  "whatsapp", "telegram", "dribbble", "behance", "pinterest",
  "snapchat", "twitch", "vimeo", "spotify", "applemusic", "threads",
  "notion", "figma", "slack", "substack", "rss",
];

export const FEATURED_ICONS = FEATURED_ICON_SLUGS.map((slug) =>
  SIMPLE_ICON_MAP.get(slug),
).filter(Boolean);

export function normalizeIconSlug(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw in LEGACY_ICON_VALUE_MAP) return LEGACY_ICON_VALUE_MAP[raw];
  return raw;
}

export function getSocialButtonShapeRadius(shape, customRadius) {
  if (shape === "rounded") return "9999px";
  if (shape === "square") return "0px";
  return customRadius || "12px";
}

export class OwbSocialMedia extends LitElement {
  static editorPlugin = null;

  static properties = {
    items: { type: Array },
    settings: { type: Object },
    node: { type: Object },
    pageConfig: { type: Object },
  };

  constructor() {
    super();
    this.items = [];
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
  }

  connectedCallback() {
    const dataProps = this.getAttribute("data-props");
    if (dataProps) {
      try {
        const props = JSON.parse(dataProps);
        if (props.items !== undefined) this.items = props.items;
        if (props.settings !== undefined) this.settings = props.settings;
      } catch (e) {}
    }
    super.connectedCallback();
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbSocialMedia.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  renderButton(item) {
    const settings = this.settings || {};
    const iconSlug = normalizeIconSlug(item?.icon);
    const icon = iconSlug ? SIMPLE_ICON_MAP.get(iconSlug) : null;
    const size = String(settings.socialButtonSize || "medium");
    const theme = String(settings.socialButtonTheme || "primary");
    const variant = String(settings.socialButtonVariant || "filled");
    const shape = String(settings.socialButtonShape || "rounded");
    const customRadius = String(settings.socialButtonRadiusCustom || "9999px");
    const displayMode = String(settings.socialDisplayMode || "icon-text");
    const iconColorMode = String(settings.socialIconColorMode || "brand");
    const showIcon = displayMode !== "text";
    const showText = displayMode !== "icon";
    const radius = getSocialButtonShapeRadius(shape, customRadius);

    const iconEl =
      showIcon && icon
        ? html`<span class="social-icon"
            >${unsafeHTML(
              iconColorMode === "brand"
                ? icon.svg.replace(
                    "<svg",
                    `<svg style="fill:#${icon.hex ?? "000"}"`,
                  )
                : icon.svg,
            )}</span
          >`
        : null;

    const label = showText
      ? html`<span>${item?.name || icon?.title || "Social"}</span>`
      : null;

    const href = String(item?.link || "").trim();

    return html`
      <a
        class="social-button size-${size} theme-${theme} variant-${variant}"
        href="${href || "#"}"
        target="_blank"
        rel="noopener noreferrer"
        style="--social-button-radius: ${radius};"
      >
        ${iconEl}${label}
      </a>
    `;
  }

  render() {
    const items = Array.isArray(this.items) ? this.items : [];
    const settings = this.settings || {};
    const alignment = String(settings.socialButtonAlignment || "left");

    return html`
      <link rel="stylesheet" href="/owb-styles/social-media.css" />
      ${items.length === 0
        ? html`<div class="social-empty">No social links configured</div>`
        : html`
            <div class="social-block">
              <div class="social-buttons-grid align-${alignment}">
                ${items.map((item) => this.renderButton(item))}
              </div>
            </div>
          `}
    `;
  }
}
