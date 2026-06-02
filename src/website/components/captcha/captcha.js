import { LitElement, html, nothing } from "lit";

let altchaLoadPromise = null;

function ensureAltchaLoaded() {
  if (typeof window === "undefined") return Promise.resolve();
  if (customElements.get("altcha-widget")) return Promise.resolve();
  if (!altchaLoadPromise) {
    altchaLoadPromise = import("altcha");
  }
  return altchaLoadPromise;
}

export const defaultCaptchaConfig = {
  type: "captcha",
  settings: {
    settingCaptchaChallengeUrl: "",
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

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.settingCaptchaChallengeUrl = "";
    this.isSettingsOpen = false;
    this._onActiveOwnerChanged = this._onActiveOwnerChanged.bind(this);
  }

  connectedCallback() {
    const dataProps = this.getAttribute("data-props");
    if (dataProps) {
      try {
        const props = JSON.parse(dataProps);
        const s = props?.settings;
        if (s && typeof s === "object") {
          if (s.settingCaptchaChallengeUrl !== undefined)
            this.settingCaptchaChallengeUrl = String(
              s.settingCaptchaChallengeUrl,
            );
        }
      } catch (e) {}
    }
    super.connectedCallback();
    if (!OwbCaptcha.editorPlugin) {
      ensureAltchaLoaded();
    }
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
    const challengeUrl = String(this.settingCaptchaChallengeUrl || "").trim();

    if (isEditorMode) {
      return html`<link rel="stylesheet" href="/owb-styles/captcha.css" />
        <div
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
                ${challengeUrl ? challengeUrl : "No challenge URL set"}
              </div>
            </div>
          </div>
        </div>`;
    }

    if (challengeUrl) {
      return html`<link rel="stylesheet" href="/owb-styles/captcha.css" />
        <altcha-widget challenge=${challengeUrl}></altcha-widget>`;
    }

    return nothing;
  }
}

if (!customElements.get("owb-captcha")) {
  customElements.define("owb-captcha", OwbCaptcha);
}
