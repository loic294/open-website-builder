import { LitElement, html, unsafeCSS } from "lit";
import styles from "./styles.css?inline";

export class SettingsSection extends LitElement {
  static styles = unsafeCSS(styles);

  static properties = {
    title: { type: String },
  };

  constructor() {
    super();
    this.title = "";
  }

  render() {
    return html`
      <div class="settings-section-container">
        <div class="settings-section-title">${this.title}</div>
        <slot></slot>
      </div>
    `;
  }
}

customElements.define("settings-section", SettingsSection);
