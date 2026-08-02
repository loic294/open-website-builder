import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { buildEditorCustomCss } from "../../utils/custom-css.js";
import { getSpacingStyleBlock } from "../../utils/spacing.js";
import { buildResponsiveCss } from "../../utils/responsive.js";

export const defaultCollapsableConfig = {
  type: "collapsable",
  settings: {
    settingTitle: "Section title",
    settingIconStyle: "chevron",
    settingIconPosition: "right",
    settingDefaultOpen: true,
    settingTitleColor: "",
    settingTitleBackgroundColor: "",
    settingTitleBorderColor: "",
  },
  content: [],
};

const CHEVRON_DOWN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
const PLUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;
const MINUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/></svg>`;

function toBool(value) {
  if (typeof value === "boolean") return value;
  return String(value || "").toLowerCase() === "true";
}

function renderIconSlot(position) {
  return html`<span class="collapsable-icon icon-slot-${position}">
    <span class="icon-variant icon-variant-chevron"
      >${unsafeHTML(CHEVRON_DOWN_SVG)}</span
    >
    <span class="icon-variant icon-variant-plus">${unsafeHTML(PLUS_SVG)}</span>
    <span class="icon-variant icon-variant-minus"
      >${unsafeHTML(MINUS_SVG)}</span
    >
  </span>`;
}

export function buildResponsiveCollapsableCss(settings = {}) {
  return buildResponsiveCss(settings, (effectiveSettings) => {
    const iconStyle = String(effectiveSettings.settingIconStyle || "chevron");
    const iconPosition =
      effectiveSettings.settingIconPosition === "left" ? "left" : "right";
    return [
      {
        selector: ".collapsable-title",
        declarations: [
          effectiveSettings.settingTitleColor
            ? `color: ${effectiveSettings.settingTitleColor}`
            : "",
          effectiveSettings.settingTitleBackgroundColor
            ? `background-color: ${effectiveSettings.settingTitleBackgroundColor}`
            : "",
          effectiveSettings.settingTitleBorderColor
            ? `border-color: ${effectiveSettings.settingTitleBorderColor}`
            : "",
        ],
      },
      {
        selector: ".icon-slot-left",
        declarations: [
          `display: ${iconPosition === "left" ? "inline-flex" : "none"}`,
        ],
      },
      {
        selector: ".icon-slot-right",
        declarations: [
          `display: ${iconPosition === "right" ? "inline-flex" : "none"}`,
        ],
      },
      {
        selector: ".icon-variant-chevron",
        declarations: [
          `display: ${iconStyle === "chevron" ? "block" : "none"}`,
        ],
      },
      {
        selector: ".collapsable-block.is-closed .icon-variant-plus",
        declarations: [
          `display: ${iconStyle === "plus-minus" ? "block" : "none"}`,
        ],
      },
      {
        selector: ".collapsable-block.is-open .icon-variant-minus",
        declarations: [
          `display: ${iconStyle === "plus-minus" ? "block" : "none"}`,
        ],
      },
    ];
  });
}

export class OwbCollapsable extends LitElement {
  static editorPlugin = null;

  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    settings: { type: Object },
    settingTitle: { type: String },
    settingIconStyle: { type: String },
    settingIconPosition: { type: String },
    settingDefaultOpen: { type: Boolean },
    settingTitleColor: { type: String },
    settingTitleBackgroundColor: { type: String },
    settingTitleBorderColor: { type: String },
    isSettingsOpen: { state: true },
    _isOpen: { state: true },
  };

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.settings = {};
    this.settingTitle = "Section title";
    this.settingIconStyle = "chevron";
    this.settingIconPosition = "right";
    this.settingDefaultOpen = true;
    this.settingTitleColor = "";
    this.settingTitleBackgroundColor = "";
    this.settingTitleBorderColor = "";
    this.isSettingsOpen = false;
    this._isOpen = true;
    this._userToggled = false;
    this._onActiveOwnerChanged = this._onActiveOwnerChanged.bind(this);
  }

  connectedCallback() {
    const dataProps = this.getAttribute("data-props");
    if (dataProps) {
      try {
        const props = JSON.parse(dataProps);
        const s = props?.settings;
        if (s && typeof s === "object") {
          this._hydrateFromSettings(s);
          this.settings = s;
        }
      } catch (e) {}
    }
    if (!this._userToggled) {
      this._isOpen = Boolean(this.settingDefaultOpen);
    }
    super.connectedCallback();
    if (OwbCollapsable.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbCollapsable.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    if (OwbCollapsable.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbCollapsable.editorPlugin.onDisconnected?.(this);
    }
    super.disconnectedCallback();
  }

  _onActiveOwnerChanged(event) {
    const ownerNodeId = String(event?.detail?.ownerNodeId || "");
    this.isSettingsOpen = Boolean(
      ownerNodeId && ownerNodeId === String(this.node?.id || ""),
    );
  }

  _hydrateFromSettings(s) {
    if (s.settingTitle !== undefined)
      this.settingTitle = String(s.settingTitle);
    if (s.settingIconStyle !== undefined)
      this.settingIconStyle = String(s.settingIconStyle);
    if (s.settingIconPosition !== undefined)
      this.settingIconPosition = String(s.settingIconPosition);
    if (s.settingDefaultOpen !== undefined)
      this.settingDefaultOpen = toBool(s.settingDefaultOpen);
    if (s.settingTitleColor !== undefined)
      this.settingTitleColor = String(s.settingTitleColor);
    if (s.settingTitleBackgroundColor !== undefined)
      this.settingTitleBackgroundColor = String(s.settingTitleBackgroundColor);
    if (s.settingTitleBorderColor !== undefined)
      this.settingTitleBorderColor = String(s.settingTitleBorderColor);
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
    OwbCollapsable.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  _onTitlePointerDown(event) {
    if (OwbCollapsable.editorPlugin) {
      OwbCollapsable.editorPlugin.onPointerDown?.(this);
      return;
    }
    event.preventDefault();
    this._userToggled = true;
    this._isOpen = !this._isOpen;
  }

  _titleInlineStyle() {
    const parts = [];
    if (this.settingTitleColor) parts.push(`color: ${this.settingTitleColor}`);
    if (this.settingTitleBackgroundColor)
      parts.push(`background-color: ${this.settingTitleBackgroundColor}`);
    if (this.settingTitleBorderColor)
      parts.push(`border-color: ${this.settingTitleBorderColor}`);
    return parts.join("; ");
  }

  render() {
    const isEditorMode = OwbCollapsable.editorPlugin !== null;
    const settings = this.settings || {};
    const spacingCss = getSpacingStyleBlock(settings);
    const customCss = String(settings.customCss || "").trim();
    const renderedCustomCss = buildEditorCustomCss(customCss, isEditorMode);
    const isOpen = isEditorMode
      ? true
      : this._userToggled
        ? this._isOpen
        : Boolean(this.settingDefaultOpen);
    const iconStyle = this.settingIconStyle || "chevron";
    const iconPosition = this.settingIconPosition === "left" ? "left" : "right";
    const titleStyle = this._titleInlineStyle();
    const responsiveCss = buildResponsiveCollapsableCss(settings);
    const blockClasses = [
      "collapsable-block",
      isOpen ? "is-open" : "is-closed",
      `icon-${iconPosition}`,
      `icon-${iconStyle}`,
      isEditorMode && this.isSettingsOpen ? "is-settings-open" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const titleNode = html`
      <button
        type="button"
        class="collapsable-title"
        style=${titleStyle || nothing}
        aria-expanded=${isOpen ? "true" : "false"}
        @pointerdown=${(event) => this._onTitlePointerDown(event)}
        @click=${(event) => {
          if (!isEditorMode) event.preventDefault();
        }}
      >
        ${renderIconSlot("left")}
        <span class="collapsable-title-text">${this.settingTitle}</span>
        ${renderIconSlot("right")}
      </button>
    `;

    return html`
      <link rel="stylesheet" href="/owb-styles/collapsable.css" />
      ${responsiveCss ? unsafeHTML(`<style>${responsiveCss}</style>`) : null}
      ${
        spacingCss
          ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`)
          : null
      }
      ${
        renderedCustomCss
          ? unsafeHTML(`<style>${renderedCustomCss}</style>`)
          : null
      }
      <div
        class=${blockClasses}
        data-editor-block=${isEditorMode ? "" : nothing}
      >
        ${titleNode}
        <div class="collapsable-content" ?hidden=${!isOpen}>
          <slot></slot>
        </div>
      </div>
    `;
  }
}
