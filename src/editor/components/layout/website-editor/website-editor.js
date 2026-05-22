import { LitElement, html, css, unsafeCSS } from "lit";

import "../../ui/button/button.js";
import { renderNode } from "../../../core/render-node.js";
import { dataLayer } from "../../../data/data-layer.js";

import "../../../../website/components/site-section/site-section.js";
import "../../../../website/components/text/text.js";

import baseStyle from "../../../../website/styles/base.css?inline";
import styles from "./website-editor-styles.css?inline";

class WebsiteEditor extends LitElement {
  static properties = {
    pageConfig: { state: true },
  };

  static styles = [unsafeCSS(baseStyle), unsafeCSS(styles), css``];

  constructor() {
    super();
    this.pageConfig = null;
    this.didLoadConfig = false;
  }

  async connectedCallback() {
    super.connectedCallback();

    if (this.didLoadConfig) {
      return;
    }

    this.didLoadConfig = true;

    try {
      this.pageConfig = await dataLayer.getPageConfig("index");
    } catch (error) {
      console.error(error);
      this.pageConfig = {
        type: "page",
        id: "home",
        title: "Home",
        url: "/",
        content: [],
      };
    }
  }

  onPageConfigUpdated = async (event) => {
    event.stopPropagation();
    this.pageConfig = event.detail;

    try {
      await dataLayer.savePageConfig("index", this.pageConfig);
    } catch (error) {
      console.error(error);
    }
  };

  render() {
    if (!this.pageConfig) {
      return html``;
    }

    const content = Array.isArray(this.pageConfig?.content)
      ? this.pageConfig.content
      : [];

    return html`<div class="editor">
      <div class="editor-top-menu">
        <div class="page-info">
          <span class="page-title">Home</span>
          <span class="page-path">/index</span>
        </div>
        <editor-btn>Publish</editor-btn>
      </div>
      <div class="website website-container">
        ${content.map((node) =>
          renderNode(
            node,
            this.pageConfig,
            this.onPageConfigUpdated,
            renderNode,
          ),
        )}
      </div>
    </div>`;
  }
}

customElements.define("website-editor", WebsiteEditor);
