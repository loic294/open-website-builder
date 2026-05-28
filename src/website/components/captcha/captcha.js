import { LitElement, html, css, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import styles from "./styles.css?inline";

export const defaultCaptchaConfig = {
  type: "captcha",
  settings: {
    captchaChallengeUrl: "",
  },
};

class SiteCaptcha extends withVariantConfig(EditorComponent) {
  static properties = {
    ...EditorComponent.properties,
    node: { type: Object },
    pageConfig: { type: Object },
    settingCaptchaChallengeUrl: { type: String },
  };

  static styles = [
    super.styles,
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
  }

  updated(changedProperties) {
    if (!changedProperties.has("node")) {
      return;
    }

    this.syncSettingsStateFromNode({
      settingCaptchaChallengeUrl: "",
    });
  }

  openCaptchaSettings() {
    this.openSettingsEditor({
      tabs: [{ id: "general", label: "General" }],
      content: () => html`
        <div>
          <settings-section title="Captcha">
            <settings-section
              title="Captcha"
              ?overridden=${this.hasAnyOverriddenKeys(
                "settingCaptchaChallengeUrl",
              )}
            >
              <editor-text-input
                label="Challenge URL"
                placeholder="https://example.com/challenge"
                .value=${this.settingCaptchaChallengeUrl}
                @change=${(event) => {
                  this.updateSettingsState({
                    settingCaptchaChallengeUrl: event.detail.value,
                  });
                }}
              ></editor-text-input>
            </settings-section>
          </settings-section>
        </div>
      `,
    });
  }

  render() {
    return html`<div
      class="captcha-block"
      data-editor-block
      @pointerdown=${() => this.openCaptchaSettings()}
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

class OwbCaptcha extends HTMLElement {
  connectedCallback() {
    const configEl = this.querySelector("script[data-owb-config]");
    let config = {};

    if (configEl) {
      try {
        config = JSON.parse(configEl.textContent || "{}");
      } catch (_error) {
        config = {};
      }
    }

    const challengeUrl = String(config.captchaChallengeUrl || "").trim();
    if (!challengeUrl) {
      return;
    }
    if (!document.querySelector("script[data-altcha-script]")) {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/gh/altcha-org/altcha/dist/altcha.min.js";
      script.type = "module";
      script.async = true;
      script.defer = true;
      script.setAttribute("data-altcha-script", "");
      document.head.appendChild(script);
    }

    const widget = document.createElement("altcha-widget");
    widget.setAttribute("challengeurl", challengeUrl);
    this.appendChild(widget);
  }
}

export const editorRenderCaptcha = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-captcha
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></site-captcha>`;
};

if (!customElements.get("site-captcha")) {
  customElements.define("site-captcha", SiteCaptcha);
}

if (!customElements.get("owb-captcha")) {
  customElements.define("owb-captcha", OwbCaptcha);
}
