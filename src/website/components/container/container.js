import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getSpacingStyleBlock } from "../../utils/spacing.js";
import {
  buildResponsiveLayoutCss,
  getSectionInlineStyle,
  getContainerInlineStyle,
} from "../../utils/layout.js";

export const defaultContainerConfig = {
  type: "container",
  content: [],
};

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
    const responsiveCss = buildResponsiveLayoutCss(
      settings,
      ".container",
      ".container",
    );
    const isEditorMode = OwbContainer.editorPlugin !== null;

    return html`
      <link rel="stylesheet" href="/owb-styles/site-section.css" />
      <link rel="stylesheet" href="/owb-styles/container.css" />
      ${responsiveCss ? unsafeHTML(`<style>${responsiveCss}</style>`) : null}
      ${
        spacingCss
          ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`)
          : null
      }
      ${customCss ? unsafeHTML(`<style>${customCss}</style>`) : null}
      <div
        class="container ${widthClass}${
          isEditorMode && this.isSettingsOpen ? " is-settings-open" : ""
        }"
        style="${getSectionInlineStyle(settings)}; ${getContainerInlineStyle(
          settings,
        )}"
        data-editor-block=${isEditorMode ? "" : nothing}
        @pointerdown=${
          isEditorMode
            ? () => OwbContainer.editorPlugin?.onPointerDown?.(this)
            : nothing
        }
      >
        <slot></slot>
      </div>
    `;
  }
}
