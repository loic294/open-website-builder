import { LitElement, html, unsafeCSS } from "lit";
import { createElement } from "lucide/dist/cjs/lucide";
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
    const optionCount = this.options.length > 0 ? this.options.length : 1;

    return html`
      <div class="radio-button-container">
        <div
          class="radio-button-background"
          style="--selected-index: ${selectedIndex >= 0
            ? selectedIndex
            : 0}; --option-count: ${optionCount};"
        ></div>
        <div class="radio-button-options">
          ${this.options.map(
            (option, index) => html`
              ${(() => {
                const hasIcon = Boolean(option.icon);
                const tooltip = option.label || option.value;
                return html`
                  <button
                    class="radio-option ${hasIcon ? "icon-only" : ""} ${this
                      .value === option.value
                      ? "selected"
                      : ""}"
                    type="button"
                    @click=${() => this.handleOptionClick(option.value)}
                    aria-pressed=${this.value === option.value}
                    aria-label=${tooltip}
                  >
                    ${option.icon ? createElement(option.icon) : html``}
                    <span class="radio-option-tooltip" role="tooltip"
                      >${tooltip}</span
                    >
                    ${hasIcon
                      ? html`<span class="sr-only">${option.label}</span>`
                      : option.label}
                  </button>
                `;
              })()}
            `,
          )}
        </div>
      </div>
    `;
  }
}

customElements.define("editor-radio-button", EditorRadioButton);
