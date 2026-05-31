import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getSpacingStyleBlock } from "../../utils/spacing.js";
import {
  getSectionInlineStyle,
  getContainerInlineStyle,
} from "../site-section/section.js";

export const defaultContainerConfig = {
  type: "container",
  content: [],
};

// Responsive breakpoints for container media queries
const RESPONSIVE_BREAKPOINTS = [
  { bucket: "tabletHorizontal", maxWidth: 1180 },
  { bucket: "mobileHorizontal", maxWidth: 844 },
  { bucket: "tabletVertical", maxWidth: 820 },
  { bucket: "mobileVertical", maxWidth: 390 },
];

function buildResponsiveContainerCss(settings) {
  const overrides = settings.responsiveOverrides;
  if (!overrides || typeof overrides !== "object") return "";

  const rules = RESPONSIVE_BREAKPOINTS.map(({ bucket, maxWidth }) => {
    const bucketOverrides = overrides[bucket];
    if (
      !bucketOverrides ||
      typeof bucketOverrides !== "object" ||
      Object.keys(bucketOverrides).length === 0
    ) {
      return "";
    }
    const merged = { ...settings, ...bucketOverrides };
    const sectionCss = getSectionInlineStyle(merged)
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `${p} !important`)
      .join("; ");
    const containerCss = getContainerInlineStyle(merged)
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `${p} !important`)
      .join("; ");
    const parts = [];
    if (sectionCss)
      parts.push(
        `@media (max-width: ${maxWidth}px) { .container { ${sectionCss} } }`,
      );
    if (containerCss)
      parts.push(
        `@media (max-width: ${maxWidth}px) { .container { ${containerCss} } }`,
      );
    return parts.join(" ");
  })
    .filter(Boolean)
    .join("\n");

  return rules;
}

export class OwbContainer extends LitElement {
  static editorPlugin = null;

  static properties = {
    settings: { type: Object },
    node: { type: Object },
    pageConfig: { type: Object },
    isSettingsOpen: { state: true },
  };

  constructor() {
    super();
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
        if (props.settings !== undefined) this.settings = props.settings;
      } catch (e) {}
    }
    super.connectedCallback();
    if (OwbContainer.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbContainer.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    if (OwbContainer.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbContainer.editorPlugin.onDisconnected?.(this);
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
    OwbContainer.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  willUpdate(changedProperties) {
    OwbContainer.editorPlugin?.onWillUpdate?.(this, changedProperties);
  }

  render() {
    const pluginRender = OwbContainer.editorPlugin?.render;
    if (typeof pluginRender === "function") {
      return pluginRender(this);
    }
    const settings = this.settings || {};
    const customCss = String(settings.customCss || "").trim();
    const spacingCss = getSpacingStyleBlock(settings);
    const width = String(settings.settingWidth || "normal");
    const widthClass =
      width === "full"
        ? "is-full-width"
        : width === "custom"
          ? ""
          : "is-normal-width";
    const responsiveCss = buildResponsiveContainerCss(settings);
    const isEditorMode = OwbContainer.editorPlugin !== null;

    return html`
      <link rel="stylesheet" href="/owb-styles/site-section.css" />
      <link rel="stylesheet" href="/owb-styles/container.css" />
      ${responsiveCss ? unsafeHTML(`<style>${responsiveCss}</style>`) : null}
      ${spacingCss
        ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`)
        : null}
      ${customCss ? unsafeHTML(`<style>${customCss}</style>`) : null}
      <div
        class="container ${widthClass}${isEditorMode && this.isSettingsOpen
          ? " is-settings-open"
          : ""}"
        style="${getSectionInlineStyle(settings)}; ${getContainerInlineStyle(
          settings,
        )}"
        data-editor-block=${isEditorMode ? "" : nothing}
        @pointerdown=${isEditorMode
          ? () => OwbContainer.editorPlugin?.onPointerDown?.(this)
          : nothing}
      >
        <slot></slot>
      </div>
    `;
  }
}
