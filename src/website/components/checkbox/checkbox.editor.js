import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import { OwbCheckbox, defaultCheckboxConfig } from "./checkbox.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

export { defaultCheckboxConfig };

OwbCheckbox.styles = [].concat(
  OwbCheckbox.styles || [],
  unsafeCSS(blocksStyles),
);

function toBool(value) {
  if (typeof value === "boolean") {
    return value;
  }

  return String(value || "").toLowerCase() === "true";
}

installEditorPlugin(OwbCheckbox, {
  onUpdated(element, changedProperties) {
    if (!changedProperties.has("node")) {
      return;
    }

    const settings = element.node?.settings || {};
    element.settingCheckboxLabel = String(
      settings.settingCheckboxLabel ??
        settings.checkboxLabel ??
        "I agree to the terms",
    );
    element.settingCheckboxName = String(
      settings.settingCheckboxName ?? settings.checkboxName ?? "agreement",
    );
    element.settingCheckboxValue = String(
      settings.settingCheckboxValue ?? settings.checkboxValue ?? "",
    );
    element.settingCheckboxDefaultChecked = toBool(
      settings.settingCheckboxDefaultChecked ??
        settings.checkboxDefaultChecked ??
        false,
    );
    element.settingCheckboxRequired = toBool(
      settings.settingCheckboxRequired ?? settings.checkboxRequired ?? false,
    );
  },

  onPointerDown(element) {
    if (EditorComponent.activeSettingsOwner === element) {
      return;
    }

    EditorComponent.openFor(element, {
      defaultState: {
        settingCheckboxLabel: "I agree to the terms",
        settingCheckboxName: "agreement",
        settingCheckboxValue: "",
        settingCheckboxDefaultChecked: false,
        settingCheckboxRequired: false,
      },
      tabs: [{ id: "general", label: "General" }],
      content: () => {
        const editor = EditorComponent.instance;
        return html`
          <settings-section title="Checkbox">
            <editor-text-input
              label="Label"
              .value=${editor.settingCheckboxLabel}
              @change=${(event) => {
                editor.updateGlobalSettingsState({
                  settingCheckboxLabel: event.detail.value,
                });
              }}
            ></editor-text-input>
            <editor-text-input
              label="Name"
              .value=${editor.settingCheckboxName}
              @change=${(event) => {
                editor.updateGlobalSettingsState({
                  settingCheckboxName: event.detail.value,
                });
              }}
            ></editor-text-input>
            <editor-text-input
              label="Value"
              .value=${editor.settingCheckboxValue}
              @change=${(event) => {
                editor.updateGlobalSettingsState({
                  settingCheckboxValue: event.detail.value,
                });
              }}
            ></editor-text-input>
            <editor-select
              label="Checked by default"
              .value=${String(editor.settingCheckboxDefaultChecked)}
              .options=${[
                { label: "No", value: "false" },
                { label: "Yes", value: "true" },
              ]}
              @change=${(event) => {
                editor.updateGlobalSettingsState({
                  settingCheckboxDefaultChecked: event.detail.value === "true",
                });
              }}
            ></editor-select>
            <editor-select
              label="Required"
              .value=${String(editor.settingCheckboxRequired)}
              .options=${[
                { label: "No", value: "false" },
                { label: "Yes", value: "true" },
              ]}
              @change=${(event) => {
                editor.updateGlobalSettingsState({
                  settingCheckboxRequired: event.detail.value === "true",
                });
              }}
            ></editor-select>
          </settings-section>
        `;
      },
    });
  },
});

export const editorRenderCheckbox = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-checkbox
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-checkbox>`;
};
