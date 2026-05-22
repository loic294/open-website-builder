import { LitElement, html, css, unsafeCSS } from "lit";

import styles from "./styles.css?inline";

export class EditorButton extends LitElement {
  static styles = unsafeCSS(styles);

  static properties = {
    style: { type: String },
  };

  render() {
    return html`<button class="${this.style}" type="button">
      <slot></slot>
    </button>`;
  }
}

customElements.define("editor-btn", EditorButton);
