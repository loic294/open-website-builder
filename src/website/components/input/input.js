import { LitElement, html, css, nothing, unsafeCSS } from "lit";
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

export class OwbInput extends LitElement {
  static editorPlugin = null;

  static properties = {
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
    isSettingsOpen: { state: true },
  };

  static styles = [
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
    this.isSettingsOpen = false;
    this._onActiveOwnerChanged = this._onActiveOwnerChanged.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    if (OwbInput.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbInput.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    if (OwbInput.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbInput.editorPlugin.onDisconnected?.(this);
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
    OwbInput.editorPlugin?.onUpdated?.(this, changedProperties);
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
    const isEditorMode = OwbInput.editorPlugin !== null;
    return html`<div
      class="form-input-block${isEditorMode && this.isSettingsOpen
        ? " is-settings-open"
        : ""}"
      data-editor-block=${isEditorMode ? "" : nothing}
      @pointerdown=${isEditorMode
        ? () => OwbInput.editorPlugin?.onPointerDown?.(this)
        : nothing}
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

if (!customElements.get("owb-input")) {
  customElements.define("owb-input", OwbInput);
}
