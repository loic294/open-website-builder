import { html, unsafeCSS } from "lit";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";
import { OwbForm } from "./form.js";
import {
  LayoutEditorController,
  registerLayoutEditorProperties,
} from "../site-section/layout-editor-controller.js";

export { defaultFormConfig } from "./form.js";

const FORM_DEFAULTS = {
  formActionUrl: "",
  formMethod: "post",
  formSubmitMode: "success-message",
  formSuccessMessage: "Thanks! Your form has been submitted.",
  formRedirectUrl: "",
};

registerLayoutEditorProperties(OwbForm, {
  formActionUrl: { type: String },
  formMethod: { type: String },
  formSubmitMode: { type: String },
  formSuccessMessage: { type: String },
  formRedirectUrl: { type: String },
});

const existingStyles = Array.isArray(OwbForm.styles)
  ? OwbForm.styles
  : OwbForm.styles
    ? [OwbForm.styles]
    : [];
OwbForm.styles = [...existingStyles, unsafeCSS(blocksStyles)];

const FORM_VARIANT_CONFIG = {
  variant: "form",
  getDefaultSettingsStateExtras() {
    return { ...FORM_DEFAULTS };
  },
  onVariantConnected(controller) {
    for (const [key, value] of Object.entries(FORM_DEFAULTS)) {
      if (controller.host[key] === undefined) {
        controller.host[key] = value;
      }
    }
  },
  renderGeneralSettingsExtras(controller) {
    const host = controller.host;
    return html`
      <settings-section title="Form">
        <editor-text-input
          label="Submit URL"
          placeholder="https://example.com/contact"
          .value=${host.formActionUrl}
          @change=${(event) => {
            host.settings.updateSettingsState({
              formActionUrl: event.detail.value,
            });
          }}
        ></editor-text-input>
        <editor-select
          label="Method"
          .value=${host.formMethod}
          .options=${[
            { label: "POST", value: "post" },
            { label: "GET", value: "get" },
          ]}
          @change=${(event) => {
            host.settings.updateSettingsState({
              formMethod: event.detail.value,
            });
          }}
        ></editor-select>
        <editor-select
          label="After submit"
          .value=${host.formSubmitMode}
          .options=${[
            { label: "Show success message", value: "success-message" },
            { label: "Redirect to URL", value: "redirect" },
          ]}
          @change=${(event) => {
            const nextMode = event.detail.value;
            host.settings.updateSettingsState({
              formSubmitMode: nextMode,
              formSuccessMessage:
                nextMode === "success-message" ? host.formSuccessMessage : "",
              formRedirectUrl:
                nextMode === "redirect" ? host.formRedirectUrl : "",
            });
          }}
        ></editor-select>

        ${host.formSubmitMode === "redirect"
          ? html`<editor-text-input
              label="Redirect URL"
              placeholder="/thank-you"
              .value=${host.formRedirectUrl}
              @change=${(event) => {
                host.settings.updateSettingsState({
                  formRedirectUrl: event.detail.value,
                });
              }}
            ></editor-text-input>`
          : html`<editor-text-input
              label="Success message"
              placeholder="Thanks! Your form has been submitted."
              .value=${host.formSuccessMessage}
              @change=${(event) => {
                host.settings.updateSettingsState({
                  formSuccessMessage: event.detail.value,
                });
              }}
            ></editor-text-input>`}
      </settings-section>
    `;
  },
};

OwbForm.editorPlugin = {
  onConnected(host) {
    if (!host._layoutEditor) {
      host._layoutEditor = new LayoutEditorController(
        host,
        FORM_VARIANT_CONFIG,
      );
    }
    host._layoutEditor.onConnected();
  },
  onWillUpdate(host, changedProperties) {
    host._layoutEditor?.onWillUpdate(changedProperties);
  },
  onUpdated(host, changedProperties) {
    host._layoutEditor?.onUpdated(changedProperties);
  },
  onDisconnected(host) {
    host._layoutEditor?.onDisconnected();
    host._layoutEditor = null;
  },
  render(host) {
    return host._layoutEditor?.render() ?? html``;
  },
};

export const editorRenderForm = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-form
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .renderNodeFn=${renderNode}
    .onPageConfigUpdated=${onPageConfigUpdated}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-form>`;
};

if (!customElements.get("owb-form")) {
  customElements.define("owb-form", OwbForm);
}
