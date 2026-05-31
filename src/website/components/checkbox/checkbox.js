import { LitElement, html, nothing } from "lit";

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

export class OwbCheckbox extends LitElement {
  static editorPlugin = null;

  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    settingCheckboxLabel: { type: String },
    settingCheckboxName: { type: String },
    settingCheckboxValue: { type: String },
    settingCheckboxDefaultChecked: { type: Boolean },
    settingCheckboxRequired: { type: Boolean },
    isSettingsOpen: { state: true },
  };

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.settingCheckboxLabel = "I agree to the terms";
    this.settingCheckboxName = "agreement";
    this.settingCheckboxValue = "";
    this.settingCheckboxDefaultChecked = false;
    this.settingCheckboxRequired = false;
    this.isSettingsOpen = false;
    this._onActiveOwnerChanged = this._onActiveOwnerChanged.bind(this);
  }

  connectedCallback() {
    const dataProps = this.getAttribute("data-props");
    if (dataProps) {
      try {
        const props = JSON.parse(dataProps);
        const s = props?.settings;
        if (s && typeof s === "object") {
          if (s.settingCheckboxLabel !== undefined)
            this.settingCheckboxLabel = String(s.settingCheckboxLabel);
          if (s.settingCheckboxName !== undefined)
            this.settingCheckboxName = String(s.settingCheckboxName);
          if (s.settingCheckboxValue !== undefined)
            this.settingCheckboxValue = String(s.settingCheckboxValue);
          if (s.settingCheckboxDefaultChecked !== undefined)
            this.settingCheckboxDefaultChecked = toBool(
              s.settingCheckboxDefaultChecked,
            );
          if (s.settingCheckboxRequired !== undefined)
            this.settingCheckboxRequired = toBool(s.settingCheckboxRequired);
        }
      } catch (e) {}
    }
    super.connectedCallback();
    if (OwbCheckbox.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbCheckbox.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    if (OwbCheckbox.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbCheckbox.editorPlugin.onDisconnected?.(this);
    }
    super.disconnectedCallback();
  }

  _onActiveOwnerChanged(event) {
    const ownerNodeId = String(event?.detail?.ownerNodeId || "");
    this.isSettingsOpen = Boolean(
      ownerNodeId && ownerNodeId === String(this.node?.id || ""),
    );
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbCheckbox.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  render() {
    const isEditorMode = OwbCheckbox.editorPlugin !== null;
    const required = toBool(this.settingCheckboxRequired);
    const defaultChecked = toBool(this.settingCheckboxDefaultChecked);
    const name = this.settingCheckboxName || "";
    const value = this.settingCheckboxValue || "";
    return html`<link rel="stylesheet" href="/owb-styles/checkbox.css" />
      <div
        class="checkbox-block${isEditorMode && this.isSettingsOpen
          ? " is-settings-open"
          : ""}"
        data-editor-block=${isEditorMode ? "" : nothing}
        @pointerdown=${isEditorMode
          ? () => OwbCheckbox.editorPlugin?.onPointerDown?.(this)
          : nothing}
      >
        <label class="checkbox-preview">
          <input
            type="checkbox"
            name=${isEditorMode || !name ? nothing : name}
            value=${isEditorMode || !value ? nothing : value}
            ?checked=${defaultChecked}
            ?required=${!isEditorMode && required}
            ?disabled=${isEditorMode}
          />
          <span class="checkbox-preview-label">
            ${this.settingCheckboxLabel || "Checkbox"}
            ${required ? html`<span class="checkbox-required">*</span>` : null}
          </span>
        </label>
      </div>`;
  }
}

if (!customElements.get("owb-checkbox")) {
  customElements.define("owb-checkbox", OwbCheckbox);
}
