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
    element.settingFieldType = String(settings.fieldType || "text");
    element.settingLabel = String(settings.label || "Field label");
    element.settingName = String(settings.name || "field");
    element.settingRequired = toBool(settings.required || false);
    element.settingPlaceholder = String(settings.placeholder || "");
    element.settingMin = String(settings.min || "");
    element.settingMax = String(settings.max || "");
    element.settingStep = String(settings.step || "");
    element.settingRows = String(settings.rows || "4");
    element.settingMinLength = String(settings.minLength || "");
    element.settingMaxLength = String(settings.maxLength || "");
    element.settingPattern = String(settings.pattern || "");
  },

  onPointerDown(element) {
    if (EditorComponent.activeSettingsOwner === element) {
      return;
    }

    EditorComponent.openFor(element, {
      defaultState: {
        fieldType: "text",
        label: "Field label",
        name: "field",
        required: false,
        placeholder: "",
        min: "",
        max: "",
        step: "",
        rows: "4",
        minLength: "",
        maxLength: "",
        pattern: "",
      },
      tabs: [{ id: "general", label: "General" }],
      content: () => {
        const editor = EditorComponent.instance;
        return html`
          <settings-section
            title="Field type"
            ?overridden=${editor.hasAnyOverriddenKeys("fieldType")}
          >
            <editor-select
              label="Type"
              .value=${editor.fieldType}
              .options=${[
                { label: "Text input", value: "text" },
                { label: "Number input", value: "number" },
                { label: "Textarea", value: "textarea" },
              ]}
              @change=${(event) => {
                editor.updateSettingsState({ fieldType: event.detail.value });
              }}
            ></editor-select>
          </settings-section>

          <settings-section
            title="Field"
            ?overridden=${editor.hasAnyOverriddenKeys(
              "label",
              "name",
              "placeholder",
              "required",
            )}
          >
            <editor-text-input
              label="Label"
              .value=${editor.label}
              @change=${(event) => {
                editor.updateSettingsState({ label: event.detail.value });
              }}
            ></editor-text-input>
            <editor-text-input
              label="Name"
              .value=${editor.name}
              @change=${(event) => {
                editor.updateSettingsState({ name: event.detail.value });
              }}
            ></editor-text-input>
            <editor-text-input
              label="Placeholder"
              .value=${editor.placeholder}
              @change=${(event) => {
                editor.updateSettingsState({ placeholder: event.detail.value });
              }}
            ></editor-text-input>
            <editor-select
              label="Required"
              .value=${String(editor.required)}
              .options=${[
                { label: "No", value: "false" },
                { label: "Yes", value: "true" },
              ]}
              @change=${(event) => {
                editor.updateSettingsState({
                  required: event.detail.value === "true",
                });
              }}
            ></editor-select>
          </settings-section>

          ${editor.fieldType === "number"
            ? html`
                <settings-section
                  title="Number options"
                  ?overridden=${editor.hasAnyOverriddenKeys(
                    "min",
                    "max",
                    "step",
                  )}
                >
                  <editor-text-input
                    label="Min"
                    type="number"
                    .value=${editor.min}
                    @change=${(event) => {
                      editor.updateSettingsState({ min: event.detail.value });
                    }}
                  ></editor-text-input>
                  <editor-text-input
                    label="Max"
                    type="number"
                    .value=${editor.max}
                    @change=${(event) => {
                      editor.updateSettingsState({ max: event.detail.value });
                    }}
                  ></editor-text-input>
                  <editor-text-input
                    label="Step"
                    type="number"
                    .value=${editor.step}
                    @change=${(event) => {
                      editor.updateSettingsState({ step: event.detail.value });
                    }}
                  ></editor-text-input>
                </settings-section>
              `
            : null}
          ${editor.fieldType === "textarea"
            ? html`
                <settings-section
                  title="Textarea options"
                  ?overridden=${editor.hasAnyOverriddenKeys("rows")}
                >
                  <editor-text-input
                    label="Rows"
                    type="number"
                    .value=${editor.rows}
                    @change=${(event) => {
                      editor.updateSettingsState({ rows: event.detail.value });
                    }}
                  ></editor-text-input>
                </settings-section>
              `
            : null}
          ${editor.fieldType === "text" || editor.fieldType === "textarea"
            ? html`
                <settings-section
                  title="Validation"
                  ?overridden=${editor.hasAnyOverriddenKeys(
                    "minLength",
                    "maxLength",
                  )}
                >
                  <editor-text-input
                    label="Min length"
                    type="number"
                    .value=${editor.minLength}
                    @change=${(event) => {
                      editor.updateSettingsState({
                        minLength: event.detail.value,
                      });
                    }}
                  ></editor-text-input>
                  <editor-text-input
                    label="Max length"
                    type="number"
                    .value=${editor.maxLength}
                    @change=${(event) => {
                      editor.updateSettingsState({
                        maxLength: event.detail.value,
                      });
                    }}
                  ></editor-text-input>
                </settings-section>
              `
            : null}
          ${editor.fieldType === "text"
            ? html`
                <settings-section
                  title="Text options"
                  ?overridden=${editor.hasAnyOverriddenKeys("pattern")}
                >
                  <editor-text-input
                    label="Pattern"
                    placeholder="[A-Za-z]+"
                    .value=${editor.pattern}
                    @change=${(event) => {
                      editor.updateSettingsState({
                        pattern: event.detail.value,
                      });
                    }}
                  ></editor-text-input>
                </settings-section>
              `
            : null}
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
