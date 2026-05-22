import { LitElement, html, unsafeCSS } from "lit";
import styles from "./styles.css?inline";

export class EditorSelect extends LitElement {
  static styles = unsafeCSS(styles);

  static properties = {
    value: { type: String },
    options: { type: Array },
    label: { type: String },
    disabled: { type: Boolean },
  };

  constructor() {
    super();
    this.value = "";
    this.options = [];
    this.label = "";
    this.disabled = false;
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
    return html`
      <label class="select-wrapper">
        ${this.label
          ? html`<span class="select-label">${this.label}</span>`
          : html``}
        <select
          class="select-input"
          .value=${this.value}
          ?disabled=${this.disabled}
          @change=${(event) => this.handleChange(event)}
        >
          ${this.options.map(
            (option) => html`
              <option value=${option.value}>${option.label}</option>
            `,
          )}
        </select>
      </label>
    `;
  }
}

customElements.define("editor-select", EditorSelect);
