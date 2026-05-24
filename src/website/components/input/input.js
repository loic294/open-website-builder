import { LitElement, html, css, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import styles from "./styles.css?inline";

export const defaultInputConfig = {
  type: "input",
  settings: {
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
};

function toBool(value) {
  if (typeof value === "boolean") {
    return value;
  }

  return String(value || "").toLowerCase() === "true";
}

class SiteInput extends withVariantConfig(EditorComponent) {
  static properties = {
    ...EditorComponent.properties,
    node: { type: Object },
    pageConfig: { type: Object },
    settingFieldType: { type: String },
    settingLabel: { type: String },
    settingName: { type: String },
    settingRequired: { type: Boolean },
    settingPlaceholder: { type: String },
    settingMin: { type: String },
    settingMax: { type: String },
    settingStep: { type: String },
    settingRows: { type: String },
    settingMinLength: { type: String },
    settingMaxLength: { type: String },
    settingPattern: { type: String },
  };

  static styles = [
    super.styles,
    unsafeCSS(styles),
    css`
      :host {
        display: block;
      }
    `,
  ];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.settingFieldType = "text";
    this.settingLabel = "Field label";
    this.settingName = "field";
    this.settingRequired = false;
    this.settingPlaceholder = "";
    this.settingMin = "";
    this.settingMax = "";
    this.settingStep = "";
    this.settingRows = "4";
    this.settingMinLength = "";
    this.settingMaxLength = "";
    this.settingPattern = "";
  }

  updated(changedProperties) {
    if (!changedProperties.has("node")) {
      return;
    }

    this.syncSettingsStateFromNode({
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
    });

    this.settingRequired = toBool(this.settingRequired);
  }

  openInputSettings() {
    this.openSettingsEditor({
      tabs: [{ id: "general", label: "General" }],
      content: () => html`
        <div>
          <settings-section title="Field type">
            <editor-select
              label="Type"
              .value=${this.settingFieldType}
              .options=${[
                { label: "Text input", value: "text" },
                { label: "Number input", value: "number" },
                { label: "Textarea", value: "textarea" },
              ]}
              @change=${(event) => {
                this.updateSettingsState({
                  settingFieldType: event.detail.value,
                });
              }}
            ></editor-select>
          </settings-section>

          <settings-section title="Field">
            <editor-text-input
              label="Label"
              .value=${this.settingLabel}
              @change=${(event) => {
                this.updateSettingsState({
                  settingLabel: event.detail.value,
                });
              }}
            ></editor-text-input>
            <editor-text-input
              label="Name"
              .value=${this.settingName}
              @change=${(event) => {
                this.updateSettingsState({
                  settingName: event.detail.value,
                });
              }}
            ></editor-text-input>
            <editor-text-input
              label="Placeholder"
              .value=${this.settingPlaceholder}
              @change=${(event) => {
                this.updateSettingsState({
                  settingPlaceholder: event.detail.value,
                });
              }}
            ></editor-text-input>
            <editor-select
              label="Required"
              .value=${String(this.settingRequired)}
              .options=${[
                { label: "No", value: "false" },
                { label: "Yes", value: "true" },
              ]}
              @change=${(event) => {
                this.updateSettingsState({
                  settingRequired: event.detail.value === "true",
                });
              }}
            ></editor-select>
          </settings-section>

          ${this.settingFieldType === "number"
            ? html`
                <settings-section title="Number options">
                  <editor-text-input
                    label="Min"
                    type="number"
                    .value=${this.settingMin}
                    @change=${(event) => {
                      this.updateSettingsState({
                        settingMin: event.detail.value,
                      });
                    }}
                  ></editor-text-input>
                  <editor-text-input
                    label="Max"
                    type="number"
                    .value=${this.settingMax}
                    @change=${(event) => {
                      this.updateSettingsState({
                        settingMax: event.detail.value,
                      });
                    }}
                  ></editor-text-input>
                  <editor-text-input
                    label="Step"
                    type="number"
                    .value=${this.settingStep}
                    @change=${(event) => {
                      this.updateSettingsState({
                        settingStep: event.detail.value,
                      });
                    }}
                  ></editor-text-input>
                </settings-section>
              `
            : null}
          ${this.settingFieldType === "textarea"
            ? html`
                <settings-section title="Textarea options">
                  <editor-text-input
                    label="Rows"
                    type="number"
                    .value=${this.settingRows}
                    @change=${(event) => {
                      this.updateSettingsState({
                        settingRows: event.detail.value,
                      });
                    }}
                  ></editor-text-input>
                </settings-section>
              `
            : null}
          ${this.settingFieldType === "text" ||
          this.settingFieldType === "textarea"
            ? html`
                <settings-section title="Validation">
                  <editor-text-input
                    label="Min length"
                    type="number"
                    .value=${this.settingMinLength}
                    @change=${(event) => {
                      this.updateSettingsState({
                        settingMinLength: event.detail.value,
                      });
                    }}
                  ></editor-text-input>
                  <editor-text-input
                    label="Max length"
                    type="number"
                    .value=${this.settingMaxLength}
                    @change=${(event) => {
                      this.updateSettingsState({
                        settingMaxLength: event.detail.value,
                      });
                    }}
                  ></editor-text-input>
                </settings-section>
              `
            : null}
          ${this.settingFieldType === "text"
            ? html`
                <settings-section title="Text options">
                  <editor-text-input
                    label="Pattern"
                    placeholder="[A-Za-z]+"
                    .value=${this.settingPattern}
                    @change=${(event) => {
                      this.updateSettingsState({
                        settingPattern: event.detail.value,
                      });
                    }}
                  ></editor-text-input>
                </settings-section>
              `
            : null}
        </div>
      `,
    });
  }

  renderPreviewField() {
    if (this.settingFieldType === "textarea") {
      return html`<textarea
        class="form-input-textarea"
        rows=${this.settingRows || "4"}
        placeholder=${this.settingPlaceholder || ""}
        disabled
      ></textarea>`;
    }

    return html`<input
      class="form-input-field"
      type=${this.settingFieldType === "number" ? "number" : "text"}
      placeholder=${this.settingPlaceholder || ""}
      disabled
    />`;
  }

  render() {
    return html`<div
      class="form-input-block"
      data-editor-block
      @pointerdown=${() => this.openInputSettings()}
    >
      <label class="form-input-label">
        ${this.settingLabel || "Field label"}
        ${this.settingRequired
          ? html`<span class="form-input-required">*</span>`
          : null}
      </label>
      ${this.renderPreviewField()}
    </div>`;
  }
}

class OwbInput extends HTMLElement {
  connectedCallback() {
    const configEl = this.querySelector("script[data-owb-config]");
    let settings = {};

    if (configEl) {
      try {
        const parsed = JSON.parse(configEl.textContent || "{}");
        settings =
          parsed && typeof parsed.settings === "object"
            ? parsed.settings
            : parsed;
      } catch (_error) {
        settings = {};
      }
    }

    const fieldType = String(settings.fieldType || "text");
    const label = String(settings.label || "");
    const name = String(settings.name || "").trim();
    const required = toBool(settings.required);
    const placeholder = String(settings.placeholder || "");

    this.textContent = "";

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      :host { display: block; }
      .owb-input-label { display: block; margin-bottom: 6px; font-weight: 600; }
      .owb-input-control { width: 100%; box-sizing: border-box; border: 1px solid rgba(0, 0, 0, 0.2); border-radius: 8px; padding: 10px 12px; font: inherit; }
      textarea.owb-input-control { min-height: 120px; resize: vertical; }
    `;

    const wrapper = document.createElement("div");
    if (label) {
      const labelEl = document.createElement("label");
      labelEl.className = "owb-input-label";
      labelEl.textContent = label;
      wrapper.appendChild(labelEl);
    }

    const control =
      fieldType === "textarea"
        ? document.createElement("textarea")
        : document.createElement("input");
    control.className = "owb-input-control";

    if (control instanceof HTMLInputElement) {
      control.type = fieldType === "number" ? "number" : "text";
    }

    if (control instanceof HTMLTextAreaElement) {
      const rows = Number.parseInt(settings.rows, 10);
      control.rows = Number.isNaN(rows) || rows < 1 ? 4 : rows;
    }

    if (name) {
      control.setAttribute("name", name);
    }

    if (placeholder) {
      control.setAttribute("placeholder", placeholder);
    }

    if (required) {
      control.required = true;
    }

    const min = String(settings.min || "").trim();
    const max = String(settings.max || "").trim();
    const step = String(settings.step || "").trim();
    const minLength = String(settings.minLength || "").trim();
    const maxLength = String(settings.maxLength || "").trim();
    const pattern = String(settings.pattern || "").trim();

    if (min && "min" in control) {
      control.setAttribute("min", min);
    }

    if (max && "max" in control) {
      control.setAttribute("max", max);
    }

    if (step && control instanceof HTMLInputElement) {
      control.setAttribute("step", step);
    }

    if (minLength && "minLength" in control) {
      control.setAttribute("minlength", minLength);
    }

    if (maxLength && "maxLength" in control) {
      control.setAttribute("maxlength", maxLength);
    }

    if (pattern && control instanceof HTMLInputElement) {
      control.setAttribute("pattern", pattern);
    }

    wrapper.appendChild(control);
    this.append(styleEl, wrapper);
  }
}

export const editorRenderInput = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-input
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></site-input>`;
};

if (!customElements.get("site-input")) {
  customElements.define("site-input", SiteInput);
}

if (!customElements.get("owb-input")) {
  customElements.define("owb-input", OwbInput);
}
