import { LitElement, html, unsafeCSS } from "lit";

import daisyUI from "../../../styles/daisyui.css?inline";
import styles from "./styles.css?inline";

class PageSettings extends LitElement {
  static styles = [unsafeCSS(daisyUI), unsafeCSS(styles)];

  connectedCallback() {
    super.connectedCallback();

    this.onSettingsChanged = () => this.requestUpdate();
    window.addEventListener("editor-route-change", this.onSettingsChanged);
    window.addEventListener(
      "owb-page-settings-changed",
      this.onSettingsChanged,
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("editor-route-change", this.onSettingsChanged);
    window.removeEventListener(
      "owb-page-settings-changed",
      this.onSettingsChanged,
    );
  }

  getWebsiteEditor() {
    return document.querySelector("website-editor");
  }

  render() {
    const editor = this.getWebsiteEditor();

    if (!editor?.pageConfig) {
      return html`<div class="settings-empty">Loading settings...</div>`;
    }

    return editor.renderCurrentSettings();
  }
}

customElements.define("page-settings", PageSettings);
