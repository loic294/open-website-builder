import { html, unsafeCSS } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import * as simpleIcons from "simple-icons";
import {
  Globe,
  Pencil,
  Plus,
  Trash,
  createElement,
} from "lucide/dist/cjs/lucide";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import styles from "./styles.css?inline";

export const defaultSocialMediaConfig = {
  type: "social-media",
  items: [
    {
      id: "social-item-1",
      name: "Social",
      link: "",
      icon: "github",
    },
  ],
};

const LEGACY_ICON_VALUE_MAP = {
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

const SIMPLE_ICON_LIBRARY = Object.values(simpleIcons)
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

const SIMPLE_ICON_MAP = new Map(
  SIMPLE_ICON_LIBRARY.map((icon) => [icon.slug, icon]),
);

const FEATURED_ICON_SLUGS = [
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

const FEATURED_ICONS = FEATURED_ICON_SLUGS.map((slug) =>
  SIMPLE_ICON_MAP.get(slug),
).filter(Boolean);

function normalizeIconSlug(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) {
    return "";
  }

  if (raw in LEGACY_ICON_VALUE_MAP) {
    return LEGACY_ICON_VALUE_MAP[raw];
  }

  return raw;
}

class SiteSocialMedia extends EditorComponent {
  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    socialItems: { type: Array },
    socialDisplayMode: { type: String },
    socialButtonTheme: { type: String },
    socialButtonVariant: { type: String },
    socialButtonSize: { type: String },
    socialButtonShape: { type: String },
    socialButtonRadiusCustom: { type: String },
    socialIconColorMode: { type: String },
    activeIconPickerItemId: { type: String },
    iconSearchQuery: { type: String },
  };

  static styles = [super.styles, unsafeCSS(styles)];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.socialItems = [];
    this.socialDisplayMode = "icon-text";
    this.socialButtonTheme = "primary";
    this.socialButtonVariant = "filled";
    this.socialButtonSize = "medium";
    this.socialButtonShape = "rounded";
    this.socialButtonRadiusCustom = "12px";
    this.socialIconColorMode = "brand";
    this.activeIconPickerItemId = "";
    this.iconSearchQuery = "";
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.socialItems = Array.isArray(this.node?.items)
        ? this.node.items.map((item) => ({ ...item }))
        : [];

      this.syncSettingsStateFromNode({
        socialDisplayMode: "icon-text",
        socialButtonTheme: "primary",
        socialButtonVariant: "filled",
        socialButtonSize: "medium",
        socialButtonShape: "rounded",
        socialButtonRadiusCustom: "12px",
        socialIconColorMode: "brand",
      });
    }
  }

  refreshSettingsOverlay() {
    if (this.isSettingsEditorOpen) {
      this.renderSettingsOverlay();
    }
  }

  updateNodeItems(nodes, targetNodeId, nextItems) {
    return nodes.map((currentNode) => {
      if (
        currentNode?.id === targetNodeId &&
        currentNode?.type === "social-media"
      ) {
        return {
          ...currentNode,
          items: nextItems,
        };
      }

      if (Array.isArray(currentNode?.content)) {
        return {
          ...currentNode,
          content: this.updateNodeItems(
            currentNode.content,
            targetNodeId,
            nextItems,
          ),
        };
      }

      return currentNode;
    });
  }

  commitItems(nextItems) {
    this.socialItems = nextItems;

    if (!this.pageConfig || !this.node?.id) {
      return;
    }

    const nextPageConfig = {
      ...this.pageConfig,
      content: this.updateNodeItems(
        Array.isArray(this.pageConfig.content) ? this.pageConfig.content : [],
        this.node.id,
        nextItems,
      ),
    };

    this.node = {
      ...this.node,
      items: nextItems,
    };
    this.pageConfig = nextPageConfig;
    this.dispatchPageConfigUpdated(nextPageConfig);
  }

  addSocialItem() {
    const nextItem = {
      id: `social-item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: "Social",
      link: "",
      icon: "github",
    };

    const nextItems = [...this.socialItems, nextItem];

    this.activeIconPickerItemId = nextItem.id;
    this.commitItems(nextItems);
    this.refreshSettingsOverlay();
  }

  updateSocialItem(itemId, patch) {
    const nextItems = this.socialItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        ...patch,
      };
    });

    this.commitItems(nextItems);
  }

  removeSocialItem(itemId) {
    if (this.activeIconPickerItemId === itemId) {
      this.activeIconPickerItemId = "";
    }
    this.commitItems(this.socialItems.filter((item) => item.id !== itemId));
    this.refreshSettingsOverlay();
  }

  toggleIconPicker(itemId) {
    if (this.activeIconPickerItemId !== itemId) {
      this.iconSearchQuery = "";
    }

    this.activeIconPickerItemId =
      this.activeIconPickerItemId === itemId ? "" : itemId;
    this.refreshSettingsOverlay();
  }

  selectIcon(itemId, iconSlug) {
    this.updateSocialItem(itemId, {
      icon: iconSlug,
    });
    this.activeIconPickerItemId = "";
    this.iconSearchQuery = "";
    this.refreshSettingsOverlay();
  }

  getSocialIcon(item) {
    const iconSlug = normalizeIconSlug(item?.icon);
    if (!iconSlug) {
      return null;
    }

    return SIMPLE_ICON_MAP.get(iconSlug) || null;
  }

  getFilteredIconResults() {
    const query = String(this.iconSearchQuery || "")
      .trim()
      .toLowerCase();

    const source = query ? SIMPLE_ICON_LIBRARY : FEATURED_ICONS;
    const filtered = query
      ? source.filter((icon) => {
          return (
            icon.title.toLowerCase().includes(query) ||
            icon.slug.toLowerCase().includes(query)
          );
        })
      : source;

    return filtered.slice(0, 300);
  }

  getTextInputEventValue(event) {
    if (typeof event?.detail?.value === "string") {
      return event.detail.value;
    }

    if (typeof event?.target?.value === "string") {
      return event.target.value;
    }

    return "";
  }

  renderSimpleIcon(icon, sizeClass = "", colorMode = "brand") {
    if (!icon) {
      return html`<span class="social-fallback-icon ${sizeClass}"
        >${createElement(Globe)}</span
      >`;
    }

    const useTextColor = colorMode === "text";
    return html`<span
      class="simple-icon ${sizeClass} ${useTextColor ? "use-text-color" : ""}"
      style=${`--simple-icon-color: #${icon.hex || "777777"};`}
      >${unsafeHTML(icon.svg)}</span
    >`;
  }

  renderIconPicker(item) {
    const results = this.getFilteredIconResults();
    const currentSlug = normalizeIconSlug(item?.icon);

    return html`
      <div
        class="social-icon-picker-panel"
        @click=${(event) => event.stopPropagation()}
      >
        <div class="social-icon-picker-search-row">
          <editor-text-input
            label="Search icons"
            placeholder="github, linkedin, youtube..."
            .value=${this.iconSearchQuery}
            @input=${(event) => {
              this.iconSearchQuery = this.getTextInputEventValue(event);
              this.refreshSettingsOverlay();
            }}
            @change=${(event) => {
              this.iconSearchQuery = this.getTextInputEventValue(event);
              this.refreshSettingsOverlay();
            }}
          ></editor-text-input>
        </div>
        <div
          class="social-icon-picker-grid"
          role="listbox"
          aria-label="Platform icons"
        >
          ${results.map((icon) => {
            const isActive = currentSlug === icon.slug;
            return html`
              <button
                type="button"
                class="social-icon-option ${isActive ? "is-active" : ""}"
                title=${icon.title}
                aria-label=${icon.title}
                @click=${() => this.selectIcon(item.id, icon.slug)}
              >
                ${this.renderSimpleIcon(icon, "is-small")}
              </button>
            `;
          })}
        </div>
      </div>
    `;
  }

  getButtonShapeRadius() {
    if (this.socialButtonShape === "rounded") {
      return "9999px";
    }

    if (this.socialButtonShape === "square") {
      return "0px";
    }

    return this.socialButtonRadiusCustom || "12px";
  }

  renderOverlayScopedStyles() {
    return html`<style>
      ${styles}
    </style>`;
  }

  openSocialSettings() {
    this.syncSettingsStateFromNode({
      socialDisplayMode: "icon-text",
      socialButtonTheme: "primary",
      socialButtonVariant: "filled",
      socialButtonSize: "medium",
      socialButtonShape: "rounded",
      socialButtonRadiusCustom: "12px",
      socialIconColorMode: "brand",
    });

    this.openSettingsEditor({
      tabs: [
        { id: "items", label: "Items" },
        { id: "buttons", label: "Buttons" },
      ],
      content: (tab) => {
        if (tab === "items") {
          return html`
            ${this.renderOverlayScopedStyles()}
            <settings-section title="Platforms">
              <editor-btn style="light" @click=${() => this.addSocialItem()}
                >${createElement(Plus)} Add platform</editor-btn
              >
              <div class="social-settings-list">
                ${this.socialItems.map(
                  (item, index) => html`
                    <div class="social-settings-item">
                      <div class="social-settings-item-header">
                        <strong>Platform ${index + 1}</strong>
                      </div>
                      <div class="social-name-icon-row">
                        <button
                          type="button"
                          class="social-icon-picker-trigger"
                          title="Choose icon"
                          @click=${() => this.toggleIconPicker(item.id)}
                        >
                          ${this.renderSimpleIcon(
                            this.getSocialIcon(item),
                            "is-medium",
                          )}
                        </button>
                        <editor-text-input
                          label="Name"
                          placeholder="GitHub"
                          .value=${item.name || ""}
                          @input=${(event) =>
                            this.updateSocialItem(item.id, {
                              name: this.getTextInputEventValue(event),
                            })}
                          @change=${(event) =>
                            this.updateSocialItem(item.id, {
                              name: this.getTextInputEventValue(event),
                            })}
                        ></editor-text-input>
                      </div>
                      ${this.activeIconPickerItemId === item.id
                        ? this.renderIconPicker(item)
                        : null}
                      <editor-text-input
                        label="Link"
                        placeholder="https://..."
                        .value=${item.link || ""}
                        @change=${(event) =>
                          this.updateSocialItem(item.id, {
                            link: this.getTextInputEventValue(event),
                          })}
                      ></editor-text-input>
                      <div class="social-item-remove-row">
                        <button
                          type="button"
                          class="social-remove-button"
                          @click=${() => this.removeSocialItem(item.id)}
                        >
                          ${createElement(Trash)} Remove platform
                        </button>
                      </div>
                    </div>
                  `,
                )}
              </div>
            </settings-section>
          `;
        }

        if (tab === "buttons") {
          return html`
            ${this.renderOverlayScopedStyles()}
            <settings-section title="Display mode">
              <editor-radio-button
                .options=${[
                  { label: "Icon + text", value: "icon-text" },
                  { label: "Icon only", value: "icon" },
                  { label: "Text only", value: "text" },
                ]}
                .value=${this.socialDisplayMode}
                @change=${(event) =>
                  this.updateSettingsState({
                    socialDisplayMode: event.detail.value,
                  })}
              ></editor-radio-button>
            </settings-section>
            <settings-section title="Button style">
              <editor-select
                label="Theme"
                .value=${this.socialButtonTheme}
                .options=${[
                  { label: "Primary", value: "primary" },
                  { label: "Secondary", value: "secondary" },
                  { label: "Light", value: "light" },
                  { label: "Dark", value: "dark" },
                  { label: "Muted", value: "muted" },
                ]}
                @change=${(event) =>
                  this.updateSettingsState({
                    socialButtonTheme: event.detail.value,
                  })}
              ></editor-select>
              <editor-radio-button
                .options=${[
                  { label: "Filled", value: "filled" },
                  { label: "Border", value: "border" },
                  { label: "Ghost", value: "ghost" },
                ]}
                .value=${this.socialButtonVariant}
                @change=${(event) =>
                  this.updateSettingsState({
                    socialButtonVariant: event.detail.value,
                  })}
              ></editor-radio-button>
              <editor-radio-button
                .options=${[
                  { label: "XS", value: "xs" },
                  { label: "Small", value: "small" },
                  { label: "Medium", value: "medium" },
                  { label: "Large", value: "large" },
                  { label: "XXL", value: "xxl" },
                ]}
                .value=${this.socialButtonSize}
                @change=${(event) =>
                  this.updateSettingsState({
                    socialButtonSize: event.detail.value,
                  })}
              ></editor-radio-button>
              <editor-radio-button
                .options=${[
                  { label: "Brand icon color", value: "brand" },
                  { label: "Text color", value: "text" },
                ]}
                .value=${this.socialIconColorMode}
                @change=${(event) =>
                  this.updateSettingsState({
                    socialIconColorMode: event.detail.value,
                  })}
              ></editor-radio-button>
              <editor-radio-button
                .options=${[
                  { label: "Rounded", value: "rounded" },
                  { label: "Square", value: "square" },
                  { label: "Border radius", value: "custom" },
                ]}
                .value=${this.socialButtonShape}
                @change=${(event) =>
                  this.updateSettingsState({
                    socialButtonShape: event.detail.value,
                  })}
              ></editor-radio-button>
              ${this.socialButtonShape === "custom"
                ? html`
                    <editor-text-input
                      label="Radius"
                      placeholder="12px"
                      .value=${this.socialButtonRadiusCustom}
                      @change=${(event) =>
                        this.updateSettingsState({
                          socialButtonRadiusCustom:
                            this.getTextInputEventValue(event),
                        })}
                    ></editor-text-input>
                  `
                : null}
            </settings-section>
          `;
        }

        return html``;
      },
    });
  }

  renderSocialButton(item) {
    const icon = this.getSocialIcon(item);
    const showIcon = this.socialDisplayMode !== "text";
    const showText = this.socialDisplayMode !== "icon";

    return html`
      <a
        class="social-button size-${this.socialButtonSize} theme-${this
          .socialButtonTheme} variant-${this.socialButtonVariant}"
        href=${item.link || "#"}
        target="_blank"
        rel="noopener noreferrer"
        style=${`--social-button-radius: ${this.getButtonShapeRadius()};`}
        @click=${(event) => {
          if (!item.link) {
            event.preventDefault();
          }
        }}
      >
        ${showIcon
          ? html`<span class="social-icon"
              >${this.renderSimpleIcon(
                icon,
                "is-button",
                this.socialIconColorMode,
              )}</span
            >`
          : null}
        ${showText ? html`<span>${item.name || "Social"}</span>` : null}
      </a>
    `;
  }

  render() {
    return html`
      <div
        data-editor-block
        class="social-block ${this.isSettingsEditorOpen
          ? "is-settings-open"
          : ""}"
      >
        <div class="social-toolbar">
          <editor-btn style="light" @click=${() => this.openSocialSettings()}
            >${createElement(Pencil)} Edit social media</editor-btn
          >
        </div>
        ${this.socialItems.length > 0
          ? html`
              <div class="social-buttons-grid">
                ${this.socialItems.map((item) => this.renderSocialButton(item))}
              </div>
            `
          : html`
              <div class="social-empty">
                Add social media entries in settings.
              </div>
            `}
      </div>
    `;
  }
}

export const editorRenderSocialMedia = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-social-media
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></site-social-media>`;
};

customElements.define("site-social-media", SiteSocialMedia);
