import { html } from "lit";
import { SiteLayoutContainerBase } from "../site-section/site-section.js";

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

class SiteForm extends SiteLayoutContainerBase {
  static properties = {
    ...SiteLayoutContainerBase.properties,
    formActionUrl: { type: String },
    formMethod: { type: String },
    formSubmitMode: { type: String },
    formSuccessMessage: { type: String },
    formRedirectUrl: { type: String },
  };

  constructor() {
    super();
    this.formActionUrl = "";
    this.formMethod = "post";
    this.formSubmitMode = "success-message";
    this.formSuccessMessage = "Thanks! Your form has been submitted.";
    this.formRedirectUrl = "";
  }

  getDefaultSettingsState() {
    return {
      ...super.getDefaultSettingsState(),
      formActionUrl: "",
      formMethod: "post",
      formSubmitMode: "success-message",
      formSuccessMessage: "Thanks! Your form has been submitted.",
      formRedirectUrl: "",
    };
  }

  renderGeneralSettingsExtras() {
    return html`
      <settings-section title="Form">
        <editor-text-input
          label="Submit URL"
          placeholder="https://example.com/contact"
          .value=${this.formActionUrl}
          @change=${(event) => {
            this.updateSettingsState({
              formActionUrl: event.detail.value,
            });
          }}
        ></editor-text-input>
        <editor-select
          label="Method"
          .value=${this.formMethod}
          .options=${[
            { label: "POST", value: "post" },
            { label: "GET", value: "get" },
          ]}
          @change=${(event) => {
            this.updateSettingsState({
              formMethod: event.detail.value,
            });
          }}
        ></editor-select>
        <editor-select
          label="After submit"
          .value=${this.formSubmitMode}
          .options=${[
            { label: "Show success message", value: "success-message" },
            { label: "Redirect to URL", value: "redirect" },
          ]}
          @change=${(event) => {
            const nextMode = event.detail.value;
            this.updateSettingsState({
              formSubmitMode: nextMode,
              formSuccessMessage:
                nextMode === "success-message" ? this.formSuccessMessage : "",
              formRedirectUrl:
                nextMode === "redirect" ? this.formRedirectUrl : "",
            });
          }}
        ></editor-select>

        ${this.formSubmitMode === "redirect"
          ? html`<editor-text-input
              label="Redirect URL"
              placeholder="/thank-you"
              .value=${this.formRedirectUrl}
              @change=${(event) => {
                this.updateSettingsState({
                  formRedirectUrl: event.detail.value,
                });
              }}
            ></editor-text-input>`
          : html`<editor-text-input
              label="Success message"
              placeholder="Thanks! Your form has been submitted."
              .value=${this.formSuccessMessage}
              @change=${(event) => {
                this.updateSettingsState({
                  formSuccessMessage: event.detail.value,
                });
              }}
            ></editor-text-input>`}
      </settings-section>
    `;
  }
}

class OwbForm extends HTMLElement {
  connectedCallback() {
    const configEl = this.querySelector("script[data-owb-config]");
    let settings = {};

    if (configEl) {
      try {
        settings = JSON.parse(configEl.textContent || "{}");
      } catch (_error) {
        settings = {};
      }
    }

    const existingForm = this.querySelector("form[data-owb-form]");
    if (existingForm) {
      return;
    }

    const action = String(settings.formActionUrl || "").trim();
    const method = String(settings.formMethod || "post").toLowerCase();
    const submitMode = String(settings.formSubmitMode || "success-message");
    const successMessage = String(
      settings.formSuccessMessage || "Thanks! Your form has been submitted.",
    );
    const redirectUrl = String(settings.formRedirectUrl || "").trim();

    const preservedNodes = Array.from(this.childNodes).filter((node) => {
      return !(node instanceof HTMLScriptElement && node.dataset.owbConfig);
    });

    this.textContent = "";

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      :host { display: block; }
      .owb-form { display: grid; gap: 12px; }
      .owb-form-success { margin: 0; color: var(--website-success-color, #267e3e); font-weight: 600; }
    `;

    const formEl = document.createElement("form");
    formEl.className = "owb-form";
    formEl.setAttribute("data-owb-form", "true");
    formEl.method = method === "get" ? "get" : "post";
    if (action) {
      formEl.action = action;
    }

    for (const node of preservedNodes) {
      formEl.appendChild(node);
    }

    const messageEl = document.createElement("p");
    messageEl.className = "owb-form-success";
    messageEl.hidden = true;
    messageEl.textContent = successMessage;

    formEl.addEventListener("submit", (event) => {
      event.preventDefault();

      if (submitMode === "redirect") {
        if (redirectUrl) {
          window.location.assign(redirectUrl);
        }
        return;
      }

      messageEl.hidden = false;
    });

    this.append(styleEl, formEl, messageEl);
  }
}

export const editorRenderForm = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-form
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .renderNodeFn=${renderNode}
    .onPageConfigUpdated=${onPageConfigUpdated}
    @page-config-updated=${onPageConfigUpdated}
  ></site-form>`;
};

if (!customElements.get("site-form")) {
  customElements.define("site-form", SiteForm);
}

if (!customElements.get("owb-form")) {
  customElements.define("owb-form", OwbForm);
}
