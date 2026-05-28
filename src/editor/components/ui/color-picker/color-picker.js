import { LitElement, html, unsafeCSS } from "lit";
import styles from "./styles.css?inline";

const DESIGN_COLOR_VARIABLES = [
  "--website-primary-color",
  "--website-secondary-color",
  "--website-light-color",
  "--website-dark-color",
  "--website-muted-color",
  "--website-neutral-color",
  "--website-background-light-color",
  "--website-background-dark-color",
  "--website-text-light-color",
  "--website-text-dark-color",
  "--website-text-neutral-color",
  "--website-text-muted-color",
  "--website-success-color",
  "--website-danger-color",
  "--website-warning-color",
  "--website-info-color",
];

export class EditorColorPicker extends LitElement {
  static styles = unsafeCSS(styles);

  static properties = {
    value: { type: String },
    label: { type: String },
    isOpen: { type: Boolean, state: true },
  };

  constructor() {
    super();
    this.value = "";
    this.label = "Color";
    this.isOpen = false;
    this._onDocumentMousedown = this._onDocumentMousedown.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("mousedown", this._onDocumentMousedown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("mousedown", this._onDocumentMousedown);
  }

  _onDocumentMousedown(e) {
    if (
      this.isOpen &&
      !this.shadowRoot.contains(e.target) &&
      !this.contains(e.target)
    ) {
      this.isOpen = false;
    }
  }

  _handleSelect(nextValue) {
    this.value = nextValue;
    this.isOpen = false;
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: nextValue },
        bubbles: true,
        composed: true,
      }),
    );
  }

  _toggleOpen(e) {
    e.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  render() {
    const swatchStyle = this.value
      ? `background-color: var(${this.value})`
      : "";

    return html`
      <div class="color-picker">
        <button
          type="button"
          class="color-trigger ${this.value ? "has-value" : "is-empty"}"
          style=${swatchStyle}
          title=${this.value || "No color selected"}
          aria-label=${this.label}
          aria-expanded=${this.isOpen ? "true" : "false"}
          @click=${this._toggleOpen}
        ></button>

        ${this.isOpen
          ? html`
              <div class="color-dropdown">
                <button
                  type="button"
                  class="color-clear"
                  @click=${() => this._handleSelect("")}
                >
                  × Clear
                </button>
                <div class="color-grid">
                  ${DESIGN_COLOR_VARIABLES.map(
                    (cssVar) => html`
                      <button
                        type="button"
                        class="color-dot ${this.value === cssVar
                          ? "is-selected"
                          : ""}"
                        style="background-color: var(${cssVar})"
                        title=${cssVar}
                        aria-label=${cssVar}
                        aria-pressed=${this.value === cssVar ? "true" : "false"}
                        @click=${() => this._handleSelect(cssVar)}
                      ></button>
                    `,
                  )}
                </div>
              </div>
            `
          : null}
      </div>
    `;
  }
}

customElements.define("editor-color-picker", EditorColorPicker);
