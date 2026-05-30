import { html } from "lit";
import { OwbLayoutContainerEditor } from "../site-section/site-section.js";
import { OwbForm } from "./form.js";

export { defaultFormConfig } from "./form.js";

OwbForm.editorPlugin = {};

class OwbFormEditor extends OwbLayoutContainerEditor {
  static properties = {
    ...OwbLayoutContainerEditor.properties,
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
            this.settings.updateSettingsState({
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
            this.settings.updateSettingsState({
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
            this.settings.updateSettingsState({
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
                this.settings.updateSettingsState({
                  formRedirectUrl: event.detail.value,
                });
              }}
            ></editor-text-input>`
          : html`<editor-text-input
              label="Success message"
              placeholder="Thanks! Your form has been submitted."
              .value=${this.formSuccessMessage}
              @change=${(event) => {
                this.settings.updateSettingsState({
                  formSuccessMessage: event.detail.value,
                });
              }}
            ></editor-text-input>`}
      </settings-section>
    `;
  }
}

export const editorRenderForm = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-form-editor
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .renderNodeFn=${renderNode}
    .onPageConfigUpdated=${onPageConfigUpdated}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-form-editor>`;
};

if (!customElements.get("owb-form-editor")) {
  customElements.define("owb-form-editor", OwbFormEditor);
}

if (!customElements.get("owb-form")) {
  customElements.define("owb-form", OwbForm);
}
