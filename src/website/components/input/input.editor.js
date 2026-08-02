import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import { OwbInput, defaultInputConfig } from "./input.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

export { defaultInputConfig };

OwbInput.styles = [].concat(OwbInput.styles || [], unsafeCSS(blocksStyles));

function toBool(value) {
  if (typeof value === "boolean") {
    return value;
  }

  return String(value || "").toLowerCase() === "true";
}

installEditorPlugin(OwbInput, {
  onUpdated(element, changedProperties) {
    if (!changedProperties.has("node")) {
      return;
    }

    const settings = element.node?.settings || {};
    element.settingFieldType = String(
      settings.settingFieldType ?? settings.fieldType ?? "text",
    );
    element.settingLabel = String(
      settings.settingLabel ?? settings.label ?? "Field label",
    );
    element.settingName = String(
      settings.settingName ?? settings.name ?? "field",
    );
    element.settingRequired = toBool(
      settings.settingRequired ?? settings.required ?? false,
    );
    element.settingPlaceholder = String(
      settings.settingPlaceholder ?? settings.placeholder ?? "",
    );
    element.settingMin = String(settings.settingMin ?? settings.min ?? "");
    element.settingMax = String(settings.settingMax ?? settings.max ?? "");
    element.settingStep = String(settings.settingStep ?? settings.step ?? "");
    element.settingRows = String(settings.settingRows ?? settings.rows ?? "4");
    element.settingMinLength = String(
      settings.settingMinLength ?? settings.minLength ?? "",
    );
    element.settingMaxLength = String(
      settings.settingMaxLength ?? settings.maxLength ?? "",
    );
    element.settingPattern = String(
      settings.settingPattern ?? settings.pattern ?? "",
    );
  },

  onPointerDown(element) {
    if (EditorComponent.activeSettingsOwner === element) {
      return;
    }

    EditorComponent.openFor(element, {
      defaultState: {
        settingFieldType: "text",
        settingLabel: "Field label",
        settingName: "field",
        settingRequired: false,
        settingPlaceholder: "",
        settingMin: "",
        settingMax: "",
        settingStep: "",
        settingRows: "4",
        settingMinLength: "",
        settingMaxLength: "",
        settingPattern: "",
      },
      tabs: [{ id: "general", label: "General" }],
      content: () => {
        const editor = EditorComponent.instance;
        return html`
          <settings-section title="Field type">
            <editor-select
              label="Type"
              .value=${editor.settingFieldType}
              .options=${[
                { label: "Text input", value: "text" },
                { label: "Number input", value: "number" },
                { label: "Textarea", value: "textarea" },
              ]}
              @change=${(event) => {
                editor.updateGlobalSettingsState({
                  settingFieldType: event.detail.value,
                });
              }}
            ></editor-select>
          </settings-section>

          <settings-section title="Field">
            <editor-text-input
              label="Label"
              .value=${editor.settingLabel}
              @change=${(event) => {
                editor.updateGlobalSettingsState({
                  settingLabel: event.detail.value,
                });
              }}
            ></editor-text-input>
            <editor-text-input
              label="Name"
              .value=${editor.settingName}
              @change=${(event) => {
                editor.updateGlobalSettingsState({
                  settingName: event.detail.value,
                });
              }}
            ></editor-text-input>
            <editor-text-input
              label="Placeholder"
              .value=${editor.settingPlaceholder}
              @change=${(event) => {
                editor.updateGlobalSettingsState({
                  settingPlaceholder: event.detail.value,
                });
              }}
            ></editor-text-input>
            <editor-select
              label="Required"
              .value=${String(editor.settingRequired)}
              .options=${[
                { label: "No", value: "false" },
                { label: "Yes", value: "true" },
              ]}
              @change=${(event) => {
                editor.updateGlobalSettingsState({
                  settingRequired: event.detail.value === "true",
                });
              }}
            ></editor-select>
          </settings-section>

          ${
            editor.settingFieldType === "number"
              ? html`
                  <settings-section title="Number options">
                    <editor-text-input
                      label="Min"
                      type="number"
                      .value=${editor.settingMin}
                      @change=${(event) => {
                        editor.updateGlobalSettingsState({
                          settingMin: event.detail.value,
                        });
                      }}
                    ></editor-text-input>
                    <editor-text-input
                      label="Max"
                      type="number"
                      .value=${editor.settingMax}
                      @change=${(event) => {
                        editor.updateGlobalSettingsState({
                          settingMax: event.detail.value,
                        });
                      }}
                    ></editor-text-input>
                    <editor-text-input
                      label="Step"
                      type="number"
                      .value=${editor.settingStep}
                      @change=${(event) => {
                        editor.updateGlobalSettingsState({
                          settingStep: event.detail.value,
                        });
                      }}
                    ></editor-text-input>
                  </settings-section>
                `
              : null
          }
          ${
            editor.settingFieldType === "textarea"
              ? html`
                  <settings-section
                    title="Textarea options"
                    ?overridden=${editor.hasAnyOverriddenKeys("settingRows")}
                  >
                    <editor-text-input
                      label="Rows"
                      type="number"
                      .value=${editor.settingRows}
                      @change=${(event) => {
                        editor.updateResponsiveSettingsState({
                          settingRows: event.detail.value,
                        });
                      }}
                    ></editor-text-input>
                  </settings-section>
                `
              : null
          }
          ${
            editor.settingFieldType === "text" ||
            editor.settingFieldType === "textarea"
              ? html`
                  <settings-section title="Validation">
                    <editor-text-input
                      label="Min length"
                      type="number"
                      .value=${editor.settingMinLength}
                      @change=${(event) => {
                        editor.updateGlobalSettingsState({
                          settingMinLength: event.detail.value,
                        });
                      }}
                    ></editor-text-input>
                    <editor-text-input
                      label="Max length"
                      type="number"
                      .value=${editor.settingMaxLength}
                      @change=${(event) => {
                        editor.updateGlobalSettingsState({
                          settingMaxLength: event.detail.value,
                        });
                      }}
                    ></editor-text-input>
                  </settings-section>
                `
              : null
          }
          ${
            editor.settingFieldType === "text"
              ? html`
                  <settings-section title="Text options">
                    <editor-text-input
                      label="Pattern"
                      placeholder="[A-Za-z]+"
                      .value=${editor.settingPattern}
                      @change=${(event) => {
                        editor.updateGlobalSettingsState({
                          settingPattern: event.detail.value,
                        });
                      }}
                    ></editor-text-input>
                  </settings-section>
                `
              : null
          }
        `;
      },
    });
  },
});

export const editorRenderInput = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-input
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-input>`;
};
