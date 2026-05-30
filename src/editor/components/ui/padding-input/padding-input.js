import { LitElement, html, unsafeCSS } from "lit";
import styles from "./styles.css?inline";

const DEFAULT_VALUE = {
  top: "",
  right: "",
  bottom: "",
  left: "",
};

export class EditorPaddingInput extends LitElement {
  static styles = unsafeCSS(styles);

  static properties = {
    value: { type: Object },
    labels: { type: Object },
  };

  constructor() {
    super();
    this.value = { ...DEFAULT_VALUE };
    this.labels = {
      top: "Top",
      right: "Right",
      bottom: "Bottom",
      left: "Left",
    };
  }

  get normalizedValue() {
    return {
      ...DEFAULT_VALUE,
      ...(this.value && typeof this.value === "object" ? this.value : {}),
    };
  }

  emitChange(key, nextValue) {
    const nextPadding = {
      ...this.normalizedValue,
      [key]: nextValue,
    };

    this.value = nextPadding;
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: nextPadding },
        bubbles: true,
        composed: true,
      }),
    );
  }

  renderField(key, placeholder) {
    const value = this.normalizedValue[key] || "";
    return html`
      <editor-text-input
        label=${this.labels[key] || key}
        placeholder=${placeholder}
        .value=${value}
        @change=${(event) => {
          event.stopPropagation();
          this.emitChange(key, event.detail.value);
        }}
      ></editor-text-input>
    `;
  }

  render() {
    return html`
      <div class="padding-input-grid">
        ${this.renderField("top", "")} ${this.renderField("right", "")}
        ${this.renderField("bottom", "")} ${this.renderField("left", "")}
      </div>
    `;
  }
}

customElements.define("editor-padding-input", EditorPaddingInput);
