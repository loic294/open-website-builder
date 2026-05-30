import { LitElement, html, css, nothing, unsafeCSS } from "lit";
import styles from "./styles.css?inline";

export const defaultCaptchaConfig = {
  type: "captcha",
  settings: {
    captchaChallengeUrl: "",
  },
};

export class OwbCaptcha extends LitElement {
  static editorPlugin = null;

  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    settingCaptchaChallengeUrl: { type: String },
    isSettingsOpen: { state: true },
  };

  static styles = [
    unsafeCSS(styles),
    css`
      :host {
        display: block;
      }
    `,
  ];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.settingCaptchaChallengeUrl = "";
    this.isSettingsOpen = false;
    this._onActiveOwnerChanged = this._onActiveOwnerChanged.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    if (OwbCaptcha.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbCaptcha.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    if (OwbCaptcha.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbCaptcha.editorPlugin.onDisconnected?.(this);
    }
    super.disconnectedCallback();
  }

  _onActiveOwnerChanged(event) {
    const ownerNodeId = String(event?.detail?.ownerNodeId || "");
    this.isSettingsOpen = Boolean(
      ownerNodeId && ownerNodeId === String(this.node?.id || ""),
    );
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbCaptcha.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  render() {
    const isEditorMode = OwbCaptcha.editorPlugin !== null;

    return html`<div
      class="captcha-block${isEditorMode && this.isSettingsOpen
        ? " is-settings-open"
        : ""}"
      data-editor-block=${isEditorMode ? "" : nothing}
      @pointerdown=${isEditorMode
        ? () => OwbCaptcha.editorPlugin?.onPointerDown?.(this)
        : nothing}
    >
      <div class="captcha-preview">
        <span class="captcha-preview-icon">🔒</span>
        <div>
          <div class="captcha-preview-label">Captcha</div>
          <div class="captcha-preview-sub">
            ${this.settingCaptchaChallengeUrl
              ? this.settingCaptchaChallengeUrl
              : "No challenge URL set"}
          </div>
        </div>
      </div>
    </div>`;
  }
}

if (!customElements.get("owb-captcha")) {
  customElements.define("owb-captcha", OwbCaptcha);
}
