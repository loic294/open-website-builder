import { LitElement, html, unsafeCSS } from "lit";
import styles from "./styles.css?inline";

export class EditorColorDots extends LitElement {
  static styles = unsafeCSS(styles);

  static properties = {
    options: { type: Array },
    value: { type: String },
    label: { type: String },
    includeNone: { type: Boolean },
  };

  constructor() {
    super();
    this.options = [];
    this.value = "";
    this.label = "Color picker";
    this.includeNone = true;
  }

  handleSelect(nextValue) {
    this.value = nextValue;
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: nextValue },
        bubbles: true,
        composed: true,
      }),
    );
  }

  renderNoneOption() {
    if (!this.includeNone) {
      return html``;
    }

    return html`
      <button
        type="button"
        class="color-dot is-none ${!this.value ? "is-selected" : ""}"
        title="None"
        aria-label="None"
        aria-pressed=${!this.value ? "true" : "false"}
        @click=${() => this.handleSelect("")}
      ></button>
    `;
  }

  render() {
    return html`
      <div class="color-dots" role="radiogroup" aria-label=${this.label}>
        ${this.renderNoneOption()}
        ${this.options.map(
          (cssVar) => html`
            <button
              type="button"
              class="color-dot ${this.value === cssVar ? "is-selected" : ""}"
              style=${`background-color: var(${cssVar});`}
              title=${cssVar}
              aria-label=${cssVar}
              aria-pressed=${this.value === cssVar ? "true" : "false"}
              @click=${() => this.handleSelect(cssVar)}
            ></button>
          `,
        )}
      </div>
    `;
  }
}

customElements.define("editor-color-dots", EditorColorDots);
