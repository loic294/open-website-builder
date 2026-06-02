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
    _submitError: { state: true },
    isSettingsOpen: { state: true },
  };

  constructor() {
    super();
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
    this._submitted = false;
    this._submitError = "";
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
    } else {
      this._onHostClick = this._onHostClick.bind(this);
      this.addEventListener("click", this._onHostClick);
    }
  }

  disconnectedCallback() {
    if (OwbForm.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbForm.editorPlugin.onDisconnected?.(this);
    } else if (this._onHostClick) {
      this.removeEventListener("click", this._onHostClick);
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
    this._submit();
  }

  _onHostClick(event) {
    const path = event.composedPath();
    const submitter = path.find(
      (el) =>
        el &&
        el.tagName === "BUTTON" &&
        String(el.type || "").toLowerCase() === "submit",
    );
    if (!submitter) return;
    event.preventDefault();
    event.stopPropagation();
    this._submit();
  }

  _collectFormFields() {
    const fields = [];
    const seen = new Set();
    const visit = (node) => {
      if (!node || seen.has(node)) return;
      seen.add(node);
      const local = node.localName;
      if (local === "input" || local === "textarea" || local === "select") {
        fields.push(node);
        return;
      }
      const children = node.children;
      if (children) {
        for (const child of children) visit(child);
      }
      if (node.shadowRoot) {
        for (const child of node.shadowRoot.children) visit(child);
      }
    };
    for (const child of this.children) visit(child);
    return fields;
  }

  async _submit() {
    const settings = this.settings || {};
    const action = String(settings.formActionUrl || "").trim();
    const method = String(settings.formMethod || "post").toLowerCase();
    const submitMode = String(settings.formSubmitMode || "success-message");
    const redirectUrl = String(settings.formRedirectUrl || "").trim();
    const fields = this._collectFormFields();

    for (const f of fields) {
      if (typeof f.checkValidity === "function" && !f.checkValidity()) {
        if (typeof f.reportValidity === "function") f.reportValidity();
        return;
      }
    }

    if (!action) {
      if (submitMode === "redirect" && redirectUrl) {
        window.location.assign(redirectUrl);
        return;
      }
      this._submitted = true;
      return;
    }

    const params = new URLSearchParams();
    for (const f of fields) {
      const name = f.name;
      if (!name) continue;
      const type = String(f.type || "").toLowerCase();
      if (type === "submit" || type === "button" || type === "reset") continue;
      if (type === "checkbox" || type === "radio") {
        if (f.checked) params.append(name, f.value || "on");
        continue;
      }
      params.append(name, f.value ?? "");
    }

    if (submitMode === "redirect" && redirectUrl) {
      this._submitError = "";
      let ok = false;
      try {
        const res = await fetch(action, {
          method: method === "get" ? "GET" : "POST",
          mode: "cors",
          headers:
            method === "get"
              ? undefined
              : { "Content-Type": "application/x-www-form-urlencoded" },
          body: method === "get" ? undefined : params.toString(),
        });
        ok = res.ok;
      } catch (e) {}
      if (!ok) {
        this._submitError =
          "Sorry, something went wrong submitting the form. Please try again.";
        return;
      }
      window.location.assign(redirectUrl);
      return;
    }

    const hidden = document.createElement("form");
    hidden.action = action;
    hidden.method = method === "get" ? "get" : "post";
    hidden.enctype = "application/x-www-form-urlencoded";
    hidden.style.display = "none";
    for (const [k, v] of params.entries()) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = k;
      input.value = v;
      hidden.appendChild(input);
    }
    document.body.appendChild(hidden);
    hidden.submit();
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
                ${this._submitError
                  ? html`<p class="owb-form-error" role="alert">
                      ${this._submitError}
                    </p>`
                  : null}
              </form>
            `}
      </div>
    `;
  }
}
