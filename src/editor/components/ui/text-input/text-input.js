import { LitElement, html, unsafeCSS } from "lit";
import styles from "./styles.css?inline";

export class EditorTextInput extends LitElement {
  static styles = unsafeCSS(styles);

  static properties = {
    type: { type: String },
    value: { type: String },
    placeholder: { type: String },
    disabled: { type: Boolean },
    readonly: { type: Boolean },
    label: { type: String },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
  };

  constructor() {
    super();
    this.type = "text";
    this.value = "";
    this.placeholder = "";
    this.disabled = false;
    this.readonly = false;
    this.label = "";
    this.min = undefined;
    this.max = undefined;
    this.step = undefined;
  }

  handleInput(event) {
    this.value = event.target.value;
    this.dispatchEvent(
      new CustomEvent("input", {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  handleChange(event) {
    this.value = event.target.value;
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    let inputElement;
    if (this.type === "number") {
      inputElement = html`
        <input
          type="number"
          .value=${this.value}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          .min=${this.min}
          .max=${this.max}
          .step=${this.step}
          class="text-input"
          @input=${(e) => this.handleInput(e)}
          @change=${(e) => this.handleChange(e)}
        />
      `;
    } else {
      inputElement = html`
        <input
          type="text"
          .value=${this.value}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          class="text-input"
          @input=${(e) => this.handleInput(e)}
          @change=${(e) => this.handleChange(e)}
        />
      `;
    }

    return html`
      <div class="input-wrapper ${this.label ? "has-prefix" : ""}">
        ${this.label
          ? html`<span class="input-prefix">${this.label}</span>`
          : null}
        ${inputElement}
      </div>
    `;
  }
}

customElements.define("editor-text-input", EditorTextInput);
