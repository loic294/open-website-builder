import { LitElement, html, css, unsafeCSS } from "lit";

import styles from "./styles.css?inline";

export class EditorButton extends LitElement {
  static styles = unsafeCSS(styles);

  static properties = {
    style: { type: String },
    disabled: { type: Boolean },
    loading: { type: Boolean },
    compact: { type: Boolean },
  };

  render() {
    return html`<button
      class="${this.style} ${this.compact ? "compact" : ""}"
      type="button"
      ?disabled=${this.disabled || this.loading}
      aria-busy=${this.loading ? "true" : "false"}
    >
      ${this.loading
        ? html`<span class="spinner" aria-hidden="true"></span>`
        : null}
      <slot></slot>
    </button>`;
  }
}

customElements.define("editor-btn", EditorButton);
