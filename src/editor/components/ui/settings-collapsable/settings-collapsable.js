import { LitElement, html, unsafeCSS } from "lit";
import { ChevronDown, createElement } from "lucide/dist/cjs/lucide";
import styles from "./styles.css?inline";

export class SettingsCollapsable extends LitElement {
  static styles = unsafeCSS(styles);

  static properties = {
    title: { type: String },
    open: { type: Boolean },
  };

  constructor() {
    super();
    this.title = "More options";
    this.open = false;
  }

  toggle() {
    this.open = !this.open;
  }

  render() {
    return html`
      <section class="collapsable ${this.open ? "is-open" : ""}">
        <button
          class="collapsable-toggle"
          type="button"
          @click=${() => this.toggle()}
          aria-expanded=${this.open ? "true" : "false"}
        >
          <span>${this.title}</span>
          <span class="chevron">${createElement(ChevronDown)}</span>
        </button>
        ${this.open
          ? html`<div class="collapsable-content"><slot></slot></div>`
          : html``}
      </section>
    `;
  }
}

customElements.define("settings-collapsable", SettingsCollapsable);
