import { LitElement, html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getSpacingStyleBlock } from "../../utils/spacing.js";
import {
  buildResponsiveLayoutCss,
  getContainerInlineStyle,
  getSectionInlineStyle,
} from "../../utils/layout.js";

export { getContainerInlineStyle, getSectionInlineStyle };

export class OwbSection extends LitElement {
  static editorPlugin = null;

  static properties = {
    settings: { type: Object },
    node: { type: Object },
    pageConfig: { type: Object },
  };

  constructor() {
    super();
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
  }

  connectedCallback() {
    const dataProps = this.getAttribute("data-props");
    if (dataProps) {
      try {
        const props = JSON.parse(dataProps);
        if (props.settings !== undefined) this.settings = props.settings;
      } catch (e) {}
    }
    super.connectedCallback();
    OwbSection.editorPlugin?.onConnected?.(this);
  }

  disconnectedCallback() {
    OwbSection.editorPlugin?.onDisconnected?.(this);
    super.disconnectedCallback();
  }

  willUpdate(changedProperties) {
    OwbSection.editorPlugin?.onWillUpdate?.(this, changedProperties);
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbSection.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  render() {
    const pluginRender = OwbSection.editorPlugin?.render;
    if (typeof pluginRender === "function") {
      return pluginRender(this);
    }
    const settings = this.settings || {};
    const customCss = String(settings.customCss || "").trim();
    const spacingCss = getSpacingStyleBlock(settings);
    const width = String(settings.settingWidth || "normal");
    const widthClass =
      width === "full"
        ? "is-full-width"
        : width === "custom"
          ? ""
          : "is-normal-width";
    const responsiveCss = buildResponsiveLayoutCss(
      settings,
      "section",
      ".container",
    );

    return html`
      <link rel="stylesheet" href="/owb-styles/site-section.css" />
      ${responsiveCss ? unsafeHTML(`<style>${responsiveCss}</style>`) : null}
      ${
        spacingCss
          ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`)
          : null
      }
      ${customCss ? unsafeHTML(`<style>${customCss}</style>`) : null}
      <section style="${getSectionInlineStyle(settings)}">
        <div
          class="container ${widthClass}"
          style="${getContainerInlineStyle(settings)}"
        >
          <slot></slot>
        </div>
      </section>
    `;
  }
}
