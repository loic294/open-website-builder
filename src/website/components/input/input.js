import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { buildResponsiveCss } from "../../utils/responsive.js";

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

function getTextareaMinHeight(rows) {
  const rowCount = Math.max(1, Number.parseInt(rows, 10) || 4);
  return `calc(${rowCount} * 1.4em + 22px)`;
}

export function buildResponsiveInputCss(settings = {}) {
  return buildResponsiveCss(settings, (effectiveSettings) => ({
    selector: ".form-input-textarea",
    declarations: {
      "min-height": getTextareaMinHeight(effectiveSettings.settingRows),
    },
  }));
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
    settings: { type: Object },
    isSettingsOpen: { state: true },
  };

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
    this.settings = {};
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
          this.settings = s;
          if (s.settingFieldType !== undefined)
            this.settingFieldType = String(s.settingFieldType);
          if (s.settingLabel !== undefined)
            this.settingLabel = String(s.settingLabel);
          if (s.settingName !== undefined)
            this.settingName = String(s.settingName);
          if (s.settingRequired !== undefined)
            this.settingRequired = toBool(s.settingRequired);
          if (s.settingPlaceholder !== undefined)
            this.settingPlaceholder = String(s.settingPlaceholder);
          if (s.settingMin !== undefined)
            this.settingMin = String(s.settingMin);
          if (s.settingMax !== undefined)
            this.settingMax = String(s.settingMax);
          if (s.settingStep !== undefined)
            this.settingStep = String(s.settingStep);
          if (s.settingRows !== undefined)
            this.settingRows = String(s.settingRows);
          if (s.settingMinLength !== undefined)
            this.settingMinLength = String(s.settingMinLength);
          if (s.settingMaxLength !== undefined)
            this.settingMaxLength = String(s.settingMaxLength);
          if (s.settingPattern !== undefined)
            this.settingPattern = String(s.settingPattern);
        }
      } catch (e) {}
    }
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

  renderLiveField() {
    const name = this.settingName || "";
    const placeholder = this.settingPlaceholder || "";
    const minLength = this.settingMinLength || "";
    const maxLength = this.settingMaxLength || "";
    const required = toBool(this.settingRequired);

    if (this.settingFieldType === "textarea") {
      const rows = Number.parseInt(this.settingRows, 10);
      return html`<textarea
        class="form-input-textarea"
        name=${name || nothing}
        rows=${Number.isNaN(rows) || rows < 1 ? 4 : rows}
        placeholder=${placeholder || nothing}
        minlength=${minLength || nothing}
        maxlength=${maxLength || nothing}
        ?required=${required}
      ></textarea>`;
    }

    return html`<input
      class="form-input-field"
      type=${this.settingFieldType === "number" ? "number" : "text"}
      name=${name || nothing}
      placeholder=${placeholder || nothing}
      min=${this.settingMin || nothing}
      max=${this.settingMax || nothing}
      step=${this.settingStep || nothing}
      minlength=${minLength || nothing}
      maxlength=${maxLength || nothing}
      pattern=${this.settingPattern || nothing}
      ?required=${required}
    />`;
  }

  render() {
    const isEditorMode = OwbInput.editorPlugin !== null;
    const required = toBool(this.settingRequired);
    const textareaCss = `.form-input-textarea { min-height: ${getTextareaMinHeight(this.settingRows)}; }`;
    const responsiveCss = buildResponsiveInputCss(this.settings);
    return html` <link rel="stylesheet" href="/owb-styles/input.css" />
      ${unsafeHTML(`<style>${textareaCss}</style>`)}
      ${responsiveCss ? unsafeHTML(`<style>${responsiveCss}</style>`) : null}
      <div
        class="form-input-block${
          isEditorMode && this.isSettingsOpen ? " is-settings-open" : ""
        }"
        data-editor-block=${isEditorMode ? "" : nothing}
        @pointerdown=${
          isEditorMode
            ? () => OwbInput.editorPlugin?.onPointerDown?.(this)
            : nothing
        }
      >
        <label class="form-input-label">
          ${this.settingLabel || "Field label"}
          ${required ? html`<span class="form-input-required">*</span>` : null}
        </label>
        ${isEditorMode ? this.renderPreviewField() : this.renderLiveField()}
      </div>`;
  }
}

if (!customElements.get("owb-input")) {
  customElements.define("owb-input", OwbInput);
}
