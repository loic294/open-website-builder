import { html, css, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import { dataLayer } from "../../../editor/data/data-layer.js";
import styles from "./styles.css?inline";

import { OwbNavbar } from "./navbar.js";

OwbNavbar.editorPlugin = {};

// ── Helpers ──────────────────────────────────────────────────────────────────

function createLinkId() {
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const bool = (v) => v === true || v === "true";

const FONT_WEIGHT_OPTIONS = [
  { label: "Thin (100)", value: "100" },
  { label: "Light (300)", value: "300" },
  { label: "Regular (400)", value: "400" },
  { label: "Medium (500)", value: "500" },
  { label: "Semi-bold (600)", value: "600" },
  { label: "Bold (700)", value: "700" },
  { label: "Extra-bold (800)", value: "800" },
];

const MOBILE_TYPE_OPTIONS = [
  { label: "Top dropdown", value: "dropdown" },
  { label: "Fullscreen overlay", value: "fullscreen" },
];

const ALIGN_H_OPTIONS = [
  { label: "Left", value: "flex-start" },
  { label: "Center", value: "center" },
  { label: "Right", value: "flex-end" },
];

const ALIGN_V_OPTIONS = [
  { label: "Top", value: "flex-start" },
  { label: "Middle", value: "center" },
  { label: "Bottom", value: "flex-end" },
];

const DEFAULT_SETTINGS = {
  navbarFontFamily: "",
  navbarFontSize: "",
  navbarFontWeight: "",
  navbarColor: "",
  navbarGap: "24px",
  navbarHoverColor: "",
  navbarUnderlineOnHover: false,
  navbarUnderlineActive: false,
  navbarMobileEnabled: false,
  navbarMobileType: "dropdown",
  navbarMobileBackgroundColor: "#ffffff",
  navbarMobileTextColor: "",
  navbarMobileAlignH: "center",
  navbarMobileAlignV: "center",
  navbarMobileFontSize: "",
  navbarMobileFontWeight: "",
  navbarMobileGap: "24px",
  navbarMobileBreakpoint: "768px",
  navbarMobilePadding: "32px",
  navbarMobileMenuIcon: "hamburger",
  navbarMobileMenuIconSize: "",
};

// ── SiteNavbar (editor) ──────────────────────────────────────────────────────

class SiteNavbar extends withVariantConfig(EditorComponent) {
  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    navbarLinks: { type: Array },
    // Design
    navbarFontFamily: { type: String },
    navbarFontSize: { type: String },
    navbarFontWeight: { type: String },
    navbarColor: { type: String },
    navbarGap: { type: String },
    navbarHoverColor: { type: String },
    navbarUnderlineOnHover: {},
    navbarUnderlineActive: {},
    // Mobile
    navbarMobileEnabled: {},
    navbarMobileType: { type: String },
    navbarMobileBackgroundColor: { type: String },
    navbarMobileTextColor: { type: String },
    navbarMobileAlignH: { type: String },
    navbarMobileAlignV: { type: String },
    navbarMobileFontSize: { type: String },
    navbarMobileFontWeight: { type: String },
    navbarMobileGap: { type: String },
    navbarMobileBreakpoint: { type: String },
    navbarMobilePadding: { type: String },
    navbarMobileMenuIcon: { type: String },
    navbarMobileMenuIconSize: { type: String },
    // Internal
    _pageOptions: { state: true },
    _addingLink: { state: true },
    _addLinkType: { state: true },
    _addLinkLabel: { state: true },
    _addLinkUrl: { state: true },
    _addLinkPageId: { state: true },
    _addLinkTarget: { state: true },
    _mobileMenuOpen: { state: true },
  };

  static styles = [super.styles, unsafeCSS(styles)];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.navbarLinks = [];
    this._pageOptions = [];
    this._addingLink = false;
    this._addLinkType = "page";
    this._addLinkLabel = "";
    this._addLinkUrl = "";
    this._addLinkPageId = "";
    this._addLinkTarget = "_self";
    this._mobileMenuOpen = false;
    Object.assign(this, DEFAULT_SETTINGS);
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.navbarLinks = Array.isArray(this.node?.links)
        ? [...this.node.links]
        : [];
      this.syncSettingsStateFromNode(DEFAULT_SETTINGS);
    }
  }

  // ── Link helpers ────────────────────────────────────────────────────────────

  _updateNodeLinks(nodes, targetId, nextLinks) {
    return nodes.map((n) => {
      if (n?.id === targetId && n?.type === "navbar") {
        return { ...n, links: nextLinks };
      }
      if (Array.isArray(n?.content)) {
        return {
          ...n,
          content: this._updateNodeLinks(n.content, targetId, nextLinks),
        };
      }
      return n;
    });
  }

  _commitLinks(links) {
    this.navbarLinks = links;
    if (!this.pageConfig || !this.node?.id) return;
    const nextPageConfig = {
      ...this.pageConfig,
      content: this._updateNodeLinks(
        Array.isArray(this.pageConfig.content) ? this.pageConfig.content : [],
        this.node.id,
        links,
      ),
    };
    this.node = { ...this.node, links };
    this.pageConfig = nextPageConfig;
    this.dispatchPageConfigUpdated(nextPageConfig);
    this.renderSettingsOverlay();
  }

  _removeLink(linkId) {
    this._commitLinks(this.navbarLinks.filter((l) => l.id !== linkId));
  }

  _moveLinkUp(linkId) {
    const idx = this.navbarLinks.findIndex((l) => l.id === linkId);
    if (idx <= 0) return;
    const next = [...this.navbarLinks];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    this._commitLinks(next);
  }

  _moveLinkDown(linkId) {
    const idx = this.navbarLinks.findIndex((l) => l.id === linkId);
    if (idx < 0 || idx >= this.navbarLinks.length - 1) return;
    const next = [...this.navbarLinks];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    this._commitLinks(next);
  }

  _addLink() {
    const label = this._addLinkLabel.trim();
    let link;
    if (this._addLinkType === "page") {
      const page = this._pageOptions.find(
        (p) => p.value === this._addLinkPageId,
      );
      link = {
        id: createLinkId(),
        type: "page",
        label: label || page?.label || this._addLinkPageId,
        pageId: this._addLinkPageId,
        url: this._addLinkPageId,
        target: "_self",
      };
    } else {
      link = {
        id: createLinkId(),
        type: "custom",
        label: label || this._addLinkUrl,
        url: this._addLinkUrl,
        target: this._addLinkTarget,
      };
    }
    this._addingLink = false;
    this._addLinkLabel = "";
    this._addLinkUrl = "";
    this._commitLinks([...this.navbarLinks, link]);
  }

  async _loadPageOptions() {
    try {
      const pages = await dataLayer.listPages();
      this._pageOptions = (pages || []).map((p) => ({
        label: p.title || p.id || p.url,
        value: p.url || p.id,
      }));
      if (!this._addLinkPageId && this._pageOptions.length > 0) {
        this._addLinkPageId = this._pageOptions[0].value;
      }
    } catch {
      this._pageOptions = [];
    }
  }

  // ── Settings ─────────────────────────────────────────────────────────────

  _openNavbarSettings() {
    this.syncSettingsStateFromNode(DEFAULT_SETTINGS);
    this._loadPageOptions();
    this.openSettingsEditor({
      tabs: [
        { id: "links", label: "Links" },
        { id: "design", label: "Design" },
        { id: "mobile", label: "Mobile" },
      ],
      content: (tab) => {
        if (tab === "links") return this._renderLinksTab();
        if (tab === "design") return this._renderDesignTab();
        if (tab === "mobile") return this._renderMobileTab();
        return html``;
      },
    });
  }

  _renderLinksTab() {
    return html`
      <settings-section title="Links">
        ${this.navbarLinks.length === 0
          ? html`<p style="font-size:13px;color:#888;margin:0 0 4px;">
              No links yet. Add your first link below.
            </p>`
          : this.navbarLinks.map(
              (link, index) => html`
                <div class="navbar-link-item">
                  <span class="navbar-link-item-label"
                    >${link.label || link.url || link.pageId}</span
                  >
                  <span class="navbar-link-item-badge"
                    >${link.type === "page"
                      ? "page"
                      : link.target === "_blank"
                        ? "ext"
                        : "url"}</span
                  >
                  ${index > 0
                    ? html`<editor-btn
                        data-style="light"
                        @click=${() => this._moveLinkUp(link.id)}
                        >↑</editor-btn
                      >`
                    : null}
                  ${index < this.navbarLinks.length - 1
                    ? html`<editor-btn
                        data-style="light"
                        @click=${() => this._moveLinkDown(link.id)}
                        >↓</editor-btn
                      >`
                    : null}
                  <editor-btn
                    data-style="light danger"
                    @click=${() => this._removeLink(link.id)}
                    >✕</editor-btn
                  >
                </div>
              `,
            )}
      </settings-section>
      ${this._addingLink
        ? html`
            <settings-section title="New link">
              <div class="navbar-add-form">
                <editor-select
                  label="Type"
                  .value=${this._addLinkType}
                  .options=${[
                    { label: "Existing page", value: "page" },
                    { label: "Custom URL", value: "custom" },
                  ]}
                  @change=${(e) => {
                    this._addLinkType = e.detail.value;
                  }}
                ></editor-select>
                ${this._addLinkType === "page"
                  ? html`
                      <editor-select
                        label="Page"
                        .value=${this._addLinkPageId}
                        .options=${this._pageOptions.length > 0
                          ? this._pageOptions
                          : [{ label: "Loading…", value: "" }]}
                        @change=${(e) => {
                          this._addLinkPageId = e.detail.value;
                        }}
                      ></editor-select>
                    `
                  : html`
                      <editor-text-input
                        label="URL"
                        placeholder="https://..."
                        .value=${this._addLinkUrl}
                        @change=${(e) => {
                          this._addLinkUrl = e.detail.value;
                        }}
                      ></editor-text-input>
                      <editor-select
                        label="Open in"
                        .value=${this._addLinkTarget}
                        .options=${[
                          { label: "Same tab", value: "_self" },
                          { label: "New tab", value: "_blank" },
                        ]}
                        @change=${(e) => {
                          this._addLinkTarget = e.detail.value;
                        }}
                      ></editor-select>
                    `}
                <editor-text-input
                  label="Label (optional)"
                  placeholder="Link label"
                  .value=${this._addLinkLabel}
                  @change=${(e) => {
                    this._addLinkLabel = e.detail.value;
                  }}
                ></editor-text-input>
                <div class="navbar-add-form-actions">
                  <editor-btn
                    data-style="primary"
                    @click=${() => this._addLink()}
                    >Add link</editor-btn
                  >
                  <editor-btn
                    data-style="light"
                    @click=${() => {
                      this._addingLink = false;
                    }}
                    >Cancel</editor-btn
                  >
                </div>
              </div>
            </settings-section>
          `
        : html`
            <editor-btn
              data-style="primary"
              @click=${() => {
                this._addingLink = true;
                this._addLinkType = "page";
                this._addLinkLabel = "";
                this._addLinkUrl = "";
                this._addLinkPageId = this._pageOptions[0]?.value || "";
                this._addLinkTarget = "_self";
              }}
              >＋ Add link</editor-btn
            >
          `}
    `;
  }

  _renderDesignTab() {
    return html`
      <settings-section title="Typography">
        <editor-text-input
          label="Font family"
          placeholder="Inherit"
          .value=${this.navbarFontFamily}
          @change=${(e) =>
            this.updateSettingsState({ navbarFontFamily: e.detail.value })}
        ></editor-text-input>
        <editor-text-input
          label="Font size"
          placeholder="Inherit"
          .value=${this.navbarFontSize}
          @change=${(e) =>
            this.updateSettingsState({ navbarFontSize: e.detail.value })}
        ></editor-text-input>
        <editor-select
          label="Font weight"
          .value=${String(this.navbarFontWeight || "")}
          .options=${[{ label: "Inherit", value: "" }, ...FONT_WEIGHT_OPTIONS]}
          @change=${(e) =>
            this.updateSettingsState({ navbarFontWeight: e.detail.value })}
        ></editor-select>
        <editor-text-input
          label="Color"
          placeholder="Inherit"
          .value=${this.navbarColor}
          @change=${(e) =>
            this.updateSettingsState({ navbarColor: e.detail.value })}
        ></editor-text-input>
        <editor-text-input
          label="Hover color"
          placeholder="Inherit"
          .value=${this.navbarHoverColor}
          @change=${(e) =>
            this.updateSettingsState({ navbarHoverColor: e.detail.value })}
        ></editor-text-input>
        <editor-select
          label="Underline on hover"
          .value=${String(bool(this.navbarUnderlineOnHover))}
          .options=${[
            { label: "No", value: "false" },
            { label: "Yes", value: "true" },
          ]}
          @change=${(e) =>
            this.updateSettingsState({
              navbarUnderlineOnHover: e.detail.value === "true",
            })}
        ></editor-select>
        <editor-select
          label="Underline active page"
          .value=${String(bool(this.navbarUnderlineActive))}
          .options=${[
            { label: "No", value: "false" },
            { label: "Yes", value: "true" },
          ]}
          @change=${(e) =>
            this.updateSettingsState({
              navbarUnderlineActive: e.detail.value === "true",
            })}
        ></editor-select>
      </settings-section>
      <settings-section title="Layout">
        <editor-text-input
          label="Gap between links"
          placeholder="24px"
          .value=${this.navbarGap}
          @change=${(e) =>
            this.updateSettingsState({ navbarGap: e.detail.value })}
        ></editor-text-input>
      </settings-section>
    `;
  }

  _renderMobileTab() {
    const mobileOn = bool(this.navbarMobileEnabled);
    return html`
      <settings-section title="Mobile menu">
        <editor-select
          label="Enable mobile menu"
          .value=${String(mobileOn)}
          .options=${[
            { label: "No", value: "false" },
            { label: "Yes", value: "true" },
          ]}
          @change=${(e) =>
            this.updateSettingsState({
              navbarMobileEnabled: e.detail.value === "true",
            })}
        ></editor-select>
      </settings-section>
      ${mobileOn
        ? html`
            <settings-section title="Menu style">
              <editor-select
                label="Menu type"
                .value=${this.navbarMobileType}
                .options=${MOBILE_TYPE_OPTIONS}
                @change=${(e) =>
                  this.updateSettingsState({
                    navbarMobileType: e.detail.value,
                  })}
              ></editor-select>
              <editor-text-input
                label="Breakpoint"
                placeholder="768px"
                .value=${this.navbarMobileBreakpoint}
                @change=${(e) =>
                  this.updateSettingsState({
                    navbarMobileBreakpoint: e.detail.value,
                  })}
              ></editor-text-input>
              <editor-text-input
                label="Menu icon"
                placeholder="hamburger"
                .value=${this.navbarMobileMenuIcon}
                @change=${(e) =>
                  this.updateSettingsState({
                    navbarMobileMenuIcon: e.detail.value,
                  })}
              ></editor-text-input>
              <editor-text-input
                label="Menu icon size"
                placeholder="1.5rem"
                .value=${this.navbarMobileMenuIconSize}
                @change=${(e) =>
                  this.updateSettingsState({
                    navbarMobileMenuIconSize: e.detail.value,
                  })}
              ></editor-text-input>
            </settings-section>
            <settings-section title="Menu appearance">
              <editor-text-input
                label="Background color"
                placeholder="#ffffff"
                .value=${this.navbarMobileBackgroundColor}
                @change=${(e) =>
                  this.updateSettingsState({
                    navbarMobileBackgroundColor: e.detail.value,
                  })}
              ></editor-text-input>
              <editor-text-input
                label="Text color"
                placeholder="Inherit"
                .value=${this.navbarMobileTextColor}
                @change=${(e) =>
                  this.updateSettingsState({
                    navbarMobileTextColor: e.detail.value,
                  })}
              ></editor-text-input>
              <editor-select
                label="Horizontal alignment"
                .value=${this.navbarMobileAlignH}
                .options=${ALIGN_H_OPTIONS}
                @change=${(e) =>
                  this.updateSettingsState({
                    navbarMobileAlignH: e.detail.value,
                  })}
              ></editor-select>
              <editor-select
                label="Vertical alignment"
                .value=${this.navbarMobileAlignV}
                .options=${ALIGN_V_OPTIONS}
                @change=${(e) =>
                  this.updateSettingsState({
                    navbarMobileAlignV: e.detail.value,
                  })}
              ></editor-select>
              <editor-text-input
                label="Padding"
                placeholder="32px"
                .value=${this.navbarMobilePadding}
                @change=${(e) =>
                  this.updateSettingsState({
                    navbarMobilePadding: e.detail.value,
                  })}
              ></editor-text-input>
            </settings-section>
            <settings-section title="Menu typography">
              <editor-text-input
                label="Font size"
                placeholder="Inherit"
                .value=${this.navbarMobileFontSize}
                @change=${(e) =>
                  this.updateSettingsState({
                    navbarMobileFontSize: e.detail.value,
                  })}
              ></editor-text-input>
              <editor-select
                label="Font weight"
                .value=${String(this.navbarMobileFontWeight || "")}
                .options=${[
                  { label: "Inherit", value: "" },
                  ...FONT_WEIGHT_OPTIONS,
                ]}
                @change=${(e) =>
                  this.updateSettingsState({
                    navbarMobileFontWeight: e.detail.value,
                  })}
              ></editor-select>
              <editor-text-input
                label="Gap between links"
                placeholder="24px"
                .value=${this.navbarMobileGap}
                @change=${(e) =>
                  this.updateSettingsState({ navbarMobileGap: e.detail.value })}
              ></editor-text-input>
            </settings-section>
          `
        : null}
    `;
  }

  // ── Style builders ────────────────────────────────────────────────────────

  _buildNavStyle() {
    return [
      this.navbarGap && `--navbar-gap: ${this.navbarGap}`,
      this.navbarFontFamily && `--navbar-font-family: ${this.navbarFontFamily}`,
      this.navbarFontSize && `--navbar-font-size: ${this.navbarFontSize}`,
      this.navbarFontWeight && `--navbar-font-weight: ${this.navbarFontWeight}`,
      this.navbarColor && `--navbar-color: ${this.navbarColor}`,
      this.navbarHoverColor && `--navbar-hover-color: ${this.navbarHoverColor}`,
    ]
      .filter(Boolean)
      .join("; ");
  }

  _buildMobileStyle() {
    return [
      this.navbarMobileBackgroundColor &&
        `--navbar-mobile-bg: ${this.navbarMobileBackgroundColor}`,
      this.navbarMobileTextColor &&
        `--navbar-mobile-color: ${this.navbarMobileTextColor}`,
      this.navbarMobileGap && `--navbar-mobile-gap: ${this.navbarMobileGap}`,
      this.navbarMobilePadding &&
        `--navbar-mobile-padding: ${this.navbarMobilePadding}`,
      this.navbarMobileAlignH &&
        `--navbar-mobile-align-h: ${this.navbarMobileAlignH}`,
      this.navbarMobileAlignV &&
        `--navbar-mobile-justify-v: ${this.navbarMobileAlignV}`,
      this.navbarMobileFontSize &&
        `--navbar-mobile-font-size: ${this.navbarMobileFontSize}`,
      this.navbarMobileFontWeight &&
        `--navbar-mobile-font-weight: ${this.navbarMobileFontWeight}`,
    ]
      .filter(Boolean)
      .join("; ");
  }

  _hamburgerIcon() {
    const icon = String(this.navbarMobileMenuIcon || "hamburger").trim();
    return icon === "hamburger" || !icon ? "☰" : icon;
  }

  // ── Render ───────────────────────────────────────────────────────────────

  render() {
    const links = this.navbarLinks;
    const mobileOn = bool(this.navbarMobileEnabled);
    const mobileType = this.navbarMobileType || "dropdown";
    const navStyle = this._buildNavStyle();
    const mobileStyle = this._buildMobileStyle();
    const currentPath = this.pageConfig?.url || "";

    return html`
      <div
        data-editor-block
        @pointerdown=${() => {
          if (!this.isSettingsEditorOpen) this._openNavbarSettings();
        }}
        class="navbar-block"
        style=${mobileOn ? mobileStyle : ""}
      >
        ${links.length > 0
          ? html`
              <nav
                class="navbar${bool(this.navbarUnderlineOnHover)
                  ? " has-underline-hover"
                  : ""}${bool(this.navbarUnderlineActive)
                  ? " has-underline-active"
                  : ""}"
                style=${navStyle}
              >
                ${links.map((link) => {
                  const href = (link.url || link.pageId || "").trim();
                  const isActive =
                    href &&
                    href !== "#" &&
                    (href === "/"
                      ? currentPath === "/" || currentPath === ""
                      : currentPath === href ||
                        currentPath.startsWith(href + "/"));
                  return html`
                    <a
                      class="navbar-link${isActive ? " is-active" : ""}"
                      href=${link.url || link.pageId || "#"}
                      target=${link.target || "_self"}
                      @click=${(e) => e.preventDefault()}
                      >${link.label || link.url || link.pageId}</a
                    >
                  `;
                })}
              </nav>
            `
          : html`
              <div class="navbar-empty">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                  />
                  <path
                    d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                  />
                </svg>
                <span>Add links in settings.</span>
              </div>
            `}
        ${mobileOn
          ? html`
              <button
                type="button"
                class="navbar-mobile-toggle"
                style="display:flex${this.navbarMobileMenuIconSize
                  ? `;font-size:${this.navbarMobileMenuIconSize}`
                  : ""}"
                @click=${(e) => {
                  e.stopPropagation();
                  this._mobileMenuOpen = !this._mobileMenuOpen;
                }}
              >
                ${this._hamburgerIcon()}
              </button>
              <div
                class="navbar-mobile-menu ${mobileType === "fullscreen"
                  ? "is-fullscreen"
                  : "is-dropdown"}${this._mobileMenuOpen ? " is-open" : ""}"
                style=${mobileStyle}
              >
                ${mobileType === "fullscreen"
                  ? html`
                      <button
                        type="button"
                        class="navbar-mobile-close"
                        @click=${(e) => {
                          e.stopPropagation();
                          this._mobileMenuOpen = false;
                        }}
                      >
                        ✕
                      </button>
                    `
                  : null}
                <div class="navbar-mobile-links">
                  ${links.map(
                    (link) => html`
                      <a
                        class="navbar-mobile-link"
                        href=${link.url || link.pageId || "#"}
                        target=${link.target || "_self"}
                        @click=${(e) => e.preventDefault()}
                        >${link.label || link.url || link.pageId}</a
                      >
                    `,
                  )}
                </div>
              </div>
            `
          : null}
      </div>
      ${this.renderSettingsOverlay()}
    `;
  }
}

// ── editorRenderNavbar ───────────────────────────────────────────────────────

export const editorRenderNavbar = (
  node,
  pageConfig,
  onPageConfigUpdated,
  _renderNode,
  renderOptions = {},
) => {
  return html`<site-navbar
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></site-navbar>`;
};

// ── Registration ─────────────────────────────────────────────────────────────

if (!customElements.get("site-navbar")) {
  customElements.define("site-navbar", SiteNavbar);
}

if (!customElements.get("owb-navbar")) {
  customElements.define("owb-navbar", OwbNavbar);
}
