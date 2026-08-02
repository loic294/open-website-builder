import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getSpacingStyleBlock } from "../../utils/spacing.js";
import { buildResponsiveCss } from "../../utils/responsive.js";
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
  "x",
  "linkedin",
  "github",
  "instagram",
  "youtube",
  "facebook",
  "tiktok",
  "discord",
  "mastodon",
  "bluesky",
  "medium",
  "reddit",
  "whatsapp",
  "telegram",
  "dribbble",
  "behance",
  "pinterest",
  "snapchat",
  "twitch",
  "vimeo",
  "spotify",
  "applemusic",
  "threads",
  "notion",
  "figma",
  "slack",
  "substack",
  "rss",
];

export const FEATURED_ICONS = FEATURED_ICON_SLUGS.map((slug) =>
  SIMPLE_ICON_MAP.get(slug),
).filter(Boolean);

export function normalizeIconSlug(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "";
  if (raw in LEGACY_ICON_VALUE_MAP) return LEGACY_ICON_VALUE_MAP[raw];
  return raw;
}

export function getSocialButtonShapeRadius(shape, customRadius) {
  if (shape === "rounded") return "9999px";
  if (shape === "square") return "0px";
  return customRadius || "12px";
}

const SOCIAL_BUTTON_SIZES = {
  xs: ["6px", "0.28rem", "0.45rem", "0.82rem", "18px"],
  small: ["7px", "0.34rem", "0.56rem", "0.9rem", "22px"],
  medium: ["8px", "0.38rem", "0.62rem", "1rem", "28px"],
  large: ["14px", "0.42rem", "0.72rem", "1.1rem", "34px"],
  xxl: ["24px", "1.4rem", "1.4rem", "0.6rem", "36px"],
};

const SOCIAL_TONES = {
  primary: "var(--website-primary-color, #116dff)",
  secondary: "var(--website-secondary-color, #f97316)",
  light: "var(--website-light-color, #f5f5f5)",
  dark: "var(--website-dark-color, #111827)",
  muted: "var(--website-muted-color, #6b7280)",
};

export function buildResponsiveSocialCss(settings = {}) {
  return buildResponsiveCss(settings, (effectiveSettings) => {
    const displayMode = String(
      effectiveSettings.socialDisplayMode || "icon-text",
    );
    const size =
      SOCIAL_BUTTON_SIZES[effectiveSettings.socialButtonSize] ||
      SOCIAL_BUTTON_SIZES.medium;
    const tone =
      SOCIAL_TONES[effectiveSettings.socialButtonTheme] || SOCIAL_TONES.primary;
    const variant = String(effectiveSettings.socialButtonVariant || "filled");
    const radius = getSocialButtonShapeRadius(
      String(effectiveSettings.socialButtonShape || "rounded"),
      String(effectiveSettings.socialButtonRadiusCustom || "12px"),
    );
    const buttonDeclarations = [
      `--social-button-gap: ${size[0]}`,
      `--social-button-padding-y: ${size[1]}`,
      `--social-button-padding-x: ${size[2]}`,
      `--social-button-font-size: ${size[3]}`,
      `--social-button-icon-size: ${size[4]}`,
      `--social-button-radius: ${radius}`,
      `border-radius: ${radius}`,
    ];
    if (variant === "border") {
      buttonDeclarations.push(
        "background: transparent",
        `border-color: ${tone}`,
        `color: ${tone}`,
      );
    } else if (variant === "ghost") {
      buttonDeclarations.push(
        `background: color-mix(in srgb, ${tone} 14%, transparent)`,
        "border-color: transparent",
        `color: ${tone}`,
      );
    } else {
      buttonDeclarations.push(
        `background: ${tone}`,
        "border-color: transparent",
        "color: var(--website-text-light-color, #fff)",
      );
    }
    return [
      {
        selector: ".social-buttons-grid",
        declarations: {
          "justify-content": String(
            effectiveSettings.socialButtonAlignment === "center"
              ? "center"
              : effectiveSettings.socialButtonAlignment === "right"
                ? "flex-end"
                : "flex-start",
          ),
        },
      },
      { selector: ".social-button", declarations: buttonDeclarations },
      {
        selector: ".social-icon",
        declarations: [
          `display: ${displayMode === "text" ? "none" : "inline-flex"}`,
        ],
      },
      {
        selector: ".social-label",
        declarations: [
          `display: ${displayMode === "icon" ? "none" : "inline"}`,
        ],
      },
      {
        selector: ".social-icon svg",
        declarations: [
          `fill: ${
            effectiveSettings.socialIconColorMode === "text"
              ? "currentColor"
              : "var(--social-brand-color, currentColor)"
          }`,
        ],
      },
    ];
  });
}

export class OwbSocialMedia extends LitElement {
  static editorPlugin = null;

  static properties = {
    items: { type: Array },
    settings: { type: Object },
    node: { type: Object },
    pageConfig: { type: Object },
    isSettingsOpen: { state: true },
  };

  constructor() {
    super();
    this.items = [];
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
    this.isSettingsOpen = false;
    this._onActiveOwnerChanged = this._onActiveOwnerChanged.bind(this);
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
    if (OwbSocialMedia.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbSocialMedia.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    if (OwbSocialMedia.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbSocialMedia.editorPlugin.onDisconnected?.(this);
    }
    super.disconnectedCallback();
  }

  _onActiveOwnerChanged(event) {
    const ownerNodeId = String(event?.detail?.ownerNodeId || "");
    this.isSettingsOpen = Boolean(
      ownerNodeId && ownerNodeId === String(this.node?.id || ""),
    );
  }

  dispatchPageConfigUpdated(nextPageConfig) {
    this.dispatchEvent(
      new CustomEvent("page-config-updated", {
        detail: nextPageConfig,
        bubbles: true,
        composed: true,
      }),
    );
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
    const radius = getSocialButtonShapeRadius(shape, customRadius);

    const iconEl = icon
      ? html`<span
          class="social-icon"
          style="--social-brand-color: #${icon.hex ?? "000"}"
          >${unsafeHTML(icon.svg)}</span
        >`
      : null;

    const label = html`<span class="social-label"
      >${item?.name || icon?.title || "Social"}</span
    >`;

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
    const spacingCss = getSpacingStyleBlock(settings);
    const responsiveCss = buildResponsiveSocialCss(settings);
    const isEditorMode = OwbSocialMedia.editorPlugin !== null;

    return html`
      <link rel="stylesheet" href="/owb-styles/social-media.css" />
      ${responsiveCss ? unsafeHTML(`<style>${responsiveCss}</style>`) : null}
      ${
        spacingCss
          ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`)
          : null
      }
      <div
        class="social-block${
          isEditorMode && this.isSettingsOpen ? " is-settings-open" : ""
        } display-${String(settings.socialDisplayMode || "icon-text")} icon-color-${String(settings.socialIconColorMode || "brand")}"
        data-editor-block=${isEditorMode ? "" : nothing}
        @pointerdown=${
          isEditorMode
            ? () => OwbSocialMedia.editorPlugin?.onPointerDown?.(this)
            : nothing
        }
      >
        ${
          items.length === 0
            ? html`<div class="social-empty">No social links configured</div>`
            : html`
                <div class="social-buttons-grid align-${alignment}">
                  ${items.map((item) => this.renderButton(item))}
                </div>
              `
        }
      </div>
    `;
  }
}
