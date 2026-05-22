import { LitElement, html, unsafeCSS } from "lit";
import styles from "./styles.css?inline";

export class EditorRadioButton extends LitElement {
  static styles = unsafeCSS(styles);

  static properties = {
    value: { type: String },
    options: { type: Array },
  };

  constructor() {
    super();
    this.value = "";
    this.options = [];
  }

  handleOptionClick(optionValue) {
    this.value = optionValue;
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: optionValue },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const selectedIndex = this.options.findIndex(
      (opt) => opt.value === this.value,
    );

    return html`
      <div class="radio-button-container">
        <div
          class="radio-button-background"
          style="--selected-index: ${selectedIndex >= 0 ? selectedIndex : 0};"
        ></div>
        <div class="radio-button-options">
          ${this.options.map(
            (option, index) => html`
              <button
                class="radio-option ${this.value === option.value
                  ? "selected"
                  : ""}"
                type="button"
                @click=${() => this.handleOptionClick(option.value)}
                aria-pressed=${this.value === option.value}
              >
                ${option.label}
              </button>
            `,
          )}
        </div>
      </div>
    `;
  }
}

customElements.define("editor-radio-button", EditorRadioButton);
