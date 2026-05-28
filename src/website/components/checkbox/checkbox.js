import { LitElement, html, css, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import styles from "./styles.css?inline";

export const defaultCheckboxConfig = {
  type: "checkbox",
  settings: {
    checkboxLabel: "I agree to the terms",
    checkboxName: "agreement",
    checkboxValue: "",
    checkboxDefaultChecked: false,
    checkboxRequired: false,
  },
};

function toBool(value) {
  if (typeof value === "boolean") {
    return value;
  }

  return String(value || "").toLowerCase() === "true";
}

class SiteCheckbox extends withVariantConfig(EditorComponent) {
  static properties = {
    ...EditorComponent.properties,
    node: { type: Object },
    pageConfig: { type: Object },
    settingCheckboxLabel: { type: String },
    settingCheckboxName: { type: String },
    settingCheckboxValue: { type: String },
    settingCheckboxDefaultChecked: { type: Boolean },
    settingCheckboxRequired: { type: Boolean },
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
    this.settingCheckboxLabel = "I agree to the terms";
    this.settingCheckboxName = "agreement";
    this.settingCheckboxValue = "";
    this.settingCheckboxDefaultChecked = false;
    this.settingCheckboxRequired = false;
  }

  updated(changedProperties) {
    if (!changedProperties.has("node")) {
      return;
    }

    this.syncSettingsStateFromNode({
      settingCheckboxLabel: "I agree to the terms",
      settingCheckboxName: "agreement",
      settingCheckboxValue: "",
      settingCheckboxDefaultChecked: false,
      settingCheckboxRequired: false,
    });

    this.settingCheckboxDefaultChecked = toBool(
      this.settingCheckboxDefaultChecked,
    );
    this.settingCheckboxRequired = toBool(this.settingCheckboxRequired);
  }

  openCheckboxSettings() {
    this.openSettingsEditor({
      tabs: [{ id: "general", label: "General" }],
      content: () => html`
        <div>
          <settings-section title="Checkbox">
            <settings-section
              title="Checkbox"
              ?overridden=${this.hasAnyOverriddenKeys(
                "settingCheckboxLabel",
                "settingCheckboxName",
                "settingCheckboxValue",
                "settingCheckboxDefaultChecked",
                "settingCheckboxRequired",
              )}
            >
              <editor-text-input
                label="Label"
                .value=${this.settingCheckboxLabel}
                @change=${(event) => {
                  this.updateSettingsState({
                    settingCheckboxLabel: event.detail.value,
                  });
                }}
              ></editor-text-input>
              <editor-text-input
                label="Name"
                .value=${this.settingCheckboxName}
                @change=${(event) => {
                  this.updateSettingsState({
                    settingCheckboxName: event.detail.value,
                  });
                }}
              ></editor-text-input>
              <editor-text-input
                label="Value"
                .value=${this.settingCheckboxValue}
                @change=${(event) => {
                  this.updateSettingsState({
                    settingCheckboxValue: event.detail.value,
                  });
                }}
              ></editor-text-input>
              <editor-select
                label="Checked by default"
                .value=${String(this.settingCheckboxDefaultChecked)}
                .options=${[
                  { label: "No", value: "false" },
                  { label: "Yes", value: "true" },
                ]}
                @change=${(event) => {
                  this.updateSettingsState({
                    settingCheckboxDefaultChecked:
                      event.detail.value === "true",
                  });
                }}
              ></editor-select>
              <editor-select
                label="Required"
                .value=${String(this.settingCheckboxRequired)}
                .options=${[
                  { label: "No", value: "false" },
                  { label: "Yes", value: "true" },
                ]}
                @change=${(event) => {
                  this.updateSettingsState({
                    settingCheckboxRequired: event.detail.value === "true",
                  });
                }}
              ></editor-select>
            </settings-section>
          </settings-section>
        </div>
      `,
    });
  }

  render() {
    return html`<div
      class="checkbox-block"
      data-editor-block
      @pointerdown=${() => this.openCheckboxSettings()}
    >
      <label class="checkbox-preview">
        <input
          type="checkbox"
          ?checked=${this.settingCheckboxDefaultChecked}
          disabled
        />
        <span class="checkbox-preview-label">
          ${this.settingCheckboxLabel || "Checkbox"}
          ${this.settingCheckboxRequired
            ? html`<span class="checkbox-required">*</span>`
            : null}
        </span>
      </label>
    </div>`;
  }
}

class OwbCheckbox extends HTMLElement {
  connectedCallback() {
    const configEl = this.querySelector("script[data-owb-config]");
    let config = {};

    if (configEl) {
      try {
        config = JSON.parse(configEl.textContent || "{}");
      } catch (_error) {
        config = {};
      }
    }

    const label = String(config.checkboxLabel || "").trim();
    const name = String(config.checkboxName || "").trim();
    const value = String(config.checkboxValue || "").trim();
    const defaultChecked =
      config.checkboxDefaultChecked === true ||
      String(config.checkboxDefaultChecked || "") === "true";
    const required =
      config.checkboxRequired === true ||
      String(config.checkboxRequired || "") === "true";

    const uid = `owb-cb-${Math.random().toString(36).slice(2, 9)}`;

    this.textContent = "";

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      :host { display: block; }
      .owb-checkbox-block { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-size: 0.95rem; cursor: pointer; }
      .owb-checkbox-block input[type="checkbox"] { width: 16px; height: 16px; flex-shrink: 0; cursor: pointer; }
    `;

    const labelEl = document.createElement("label");
    labelEl.className = "owb-checkbox-block";
    labelEl.setAttribute("for", uid);

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = uid;
    if (name) input.name = name;
    if (value) input.value = value;
    if (defaultChecked) input.checked = true;
    if (required) input.required = true;

    const span = document.createElement("span");
    span.textContent = label;

    if (required) {
      const asterisk = document.createElement("span");
      asterisk.style.color = "#b42318";
      asterisk.style.marginLeft = "2px";
      asterisk.textContent = "*";
      span.appendChild(asterisk);
    }

    labelEl.appendChild(input);
    labelEl.appendChild(span);
    this.append(styleEl, labelEl);
  }
}

export const editorRenderCheckbox = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-checkbox
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></site-checkbox>`;
};

if (!customElements.get("site-checkbox")) {
  customElements.define("site-checkbox", SiteCheckbox);
}

if (!customElements.get("owb-checkbox")) {
  customElements.define("owb-checkbox", OwbCheckbox);
}
