import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import { OwbCaptcha, defaultCaptchaConfig } from "./captcha.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

export { defaultCaptchaConfig };

OwbCaptcha.styles = [].concat(OwbCaptcha.styles || [], unsafeCSS(blocksStyles));

installEditorPlugin(OwbCaptcha, {
  onUpdated(element, changedProperties) {
    if (!changedProperties.has("node")) {
      return;
    }

    element.settingCaptchaChallengeUrl = String(
      element.node?.settings?.captchaChallengeUrl || "",
    );
  },

  onPointerDown(element) {
    if (EditorComponent.activeSettingsOwner === element) {
      return;
    }

    EditorComponent.openFor(element, {
      defaultState: {
        settingCaptchaChallengeUrl: "",
      },
      tabs: [{ id: "general", label: "General" }],
      content: () => {
        const editor = EditorComponent.instance;
        return html`
          <settings-section
            title="Captcha"
            ?overridden=${editor.hasAnyOverriddenKeys(
              "settingCaptchaChallengeUrl",
            )}
          >
            <editor-text-input
              label="Challenge URL"
              placeholder="https://example.com/challenge"
              .value=${editor.settingCaptchaChallengeUrl}
              @change=${(event) => {
                editor.updateSettingsState({
                  settingCaptchaChallengeUrl: event.detail.value,
                });
              }}
            ></editor-text-input>
          </settings-section>
        `;
      },
    });
  },
});

export const editorRenderCaptcha = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-captcha
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-captcha>`;
};
