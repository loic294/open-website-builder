import { LitElement, html, css } from "lit";
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

  static styles = css`
    :host {
      display: block;
    }
    .owb-form-container {
      position: relative;
      padding: var(--section-padding-top, 7rem)
        var(--section-padding-right, 2rem) var(--section-padding-bottom, 6rem)
        var(--section-padding-left, 2rem);
      margin: 0 auto;
    }
    .owb-form-container.is-normal-width {
      max-width: 960px;
    }
    .owb-form-container.is-full-width {
      max-width: 100%;
    }
    .owb-form {
      display: grid;
      gap: 12px;
    }
    .owb-form-success {
      margin: 10px 0 0;
      color: var(--website-success-color, #267e3e);
      font-weight: 600;
    }
  `;

  static properties = {
    settings: { type: Object },
    node: { type: Object },
    pageConfig: { type: Object },
    _submitted: { state: true },
  };

  constructor() {
    super();
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
    this._submitted = false;
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
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbForm.editorPlugin?.onUpdated?.(this, changedProperties);
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

    return html`
      ${spacingCss ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`) : null}
      ${customCss ? unsafeHTML(`<style>${customCss}</style>`) : null}
      <div
        class="owb-form-container ${widthClass}"
        style="${getSectionInlineStyle(settings)}; ${getContainerInlineStyle(
          settings,
        )}"
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
