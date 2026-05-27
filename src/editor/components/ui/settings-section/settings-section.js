import { LitElement, html, unsafeCSS } from "lit";
import styles from "./styles.css?inline";

export class SettingsSection extends LitElement {
  static styles = unsafeCSS(styles);

  static properties = {
    title: { type: String },
    overridden: { type: Boolean },
  };

  constructor() {
    super();
    this.title = "";
    this.overridden = false;
  }

  render() {
    return html`
      <div
        class="settings-section-container ${this.overridden
          ? "is-overridden"
          : ""}"
      >
        <div class="settings-section-title">
          ${this.title}
          ${this.overridden
            ? html`<span
                class="settings-section-override-dot"
                title="This setting is customized for the current viewport"
              ></span>`
            : ""}
        </div>
        <slot></slot>
      </div>
    `;
  }
}

customElements.define("settings-section", SettingsSection);
