import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getSpacingStyleBlock } from "../../utils/spacing.js";
import {
  getSectionInlineStyle,
  getContainerInlineStyle,
} from "../site-section/section.js";

export const defaultFormConfig = {
  type: "form",
  content: [],
  settings: {
    formActionUrl: "",
    formMethod: "post",
    formSubmitMode: "success-message",
    formSuccessMessage: "Thanks! Your form has been submitted.",
    formRedirectUrl: "",
  },
};

export class OwbForm extends LitElement {
  static editorPlugin = null;

  static properties = {
    settings: { type: Object },
    node: { type: Object },
    pageConfig: { type: Object },
    _submitted: { state: true },
    isSettingsOpen: { state: true },
  };

  constructor() {
    super();
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
    this._submitted = false;
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
    if (OwbForm.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbForm.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    if (OwbForm.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbForm.editorPlugin.onDisconnected?.(this);
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
    OwbForm.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  willUpdate(changedProperties) {
    OwbForm.editorPlugin?.onWillUpdate?.(this, changedProperties);
  }

  _handleSubmit(event) {
    event.preventDefault();
    const settings = this.settings || {};
    const submitMode = String(settings.formSubmitMode || "success-message");
    const redirectUrl = String(settings.formRedirectUrl || "").trim();

    if (submitMode === "redirect") {
      if (redirectUrl && typeof window !== "undefined") {
        window.location.assign(redirectUrl);
      }
      return;
    }

    this._submitted = true;
  }

  render() {
    const pluginRender = OwbForm.editorPlugin?.render;
    if (typeof pluginRender === "function") {
      return pluginRender(this);
    }
    const settings = this.settings || {};
    const action = String(settings.formActionUrl || "").trim();
    const method = String(settings.formMethod || "post").toLowerCase();
    const successMessage = String(
      settings.formSuccessMessage || "Thanks! Your form has been submitted.",
    );
    const customCss = String(settings.customCss || "").trim();
    const spacingCss = getSpacingStyleBlock(settings);
    const width = String(settings.settingWidth || "normal");
    const widthClass =
      width === "full"
        ? "is-full-width"
        : width === "custom"
          ? ""
          : "is-normal-width";
    const isEditorMode = OwbForm.editorPlugin !== null;

    return html`
      <link rel="stylesheet" href="/owb-styles/site-section.css" />
      <link rel="stylesheet" href="/owb-styles/form.css" />
      ${spacingCss
        ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`)
        : null}
      ${customCss ? unsafeHTML(`<style>${customCss}</style>`) : null}
      <div
        class="owb-form-container ${widthClass}${isEditorMode &&
        this.isSettingsOpen
          ? " is-settings-open"
          : ""}"
        style="${getSectionInlineStyle(settings)}; ${getContainerInlineStyle(
          settings,
        )}"
        data-editor-block=${isEditorMode ? "" : nothing}
        @pointerdown=${isEditorMode
          ? () => OwbForm.editorPlugin?.onPointerDown?.(this)
          : nothing}
      >
        ${this._submitted
          ? html`<p class="owb-form-success">${successMessage}</p>`
          : html`
              <form
                class="owb-form"
                method=${method === "get" ? "get" : "post"}
                action=${action || ""}
                @submit=${this._handleSubmit}
              >
                <slot></slot>
              </form>
            `}
      </div>
    `;
  }
}
