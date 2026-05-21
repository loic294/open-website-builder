import { LitElement, html, css, unsafeCSS } from "lit";

import "../components/button/button.js";
import { renderNode } from "../core/render-node.js";

import "../../website/components/site-section/site-section.js";
import "../../website/components/text/text.js";

import baseStyle from "../../website/styles/base.css?inline";
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
      const response = await fetch("/__page-config");
      if (!response.ok) {
        throw new Error(`Failed to load page config: ${response.status}`);
      }
      this.pageConfig = await response.json();
    } catch (error) {
      console.error(error);
      this.pageConfig = { type: "page", title: "Home", content: [] };
    }
  }

  async savePageConfig(pageConfig) {
    const response = await fetch("/__save-page-config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageConfig),
    });

    if (!response.ok) {
      throw new Error(`Failed to save page config: ${response.status}`);
    }
  }

  async addSectionAfter(node, position = "after") {
    const content = Array.isArray(this.pageConfig?.content)
      ? this.pageConfig.content
      : [];
    const index = content.indexOf(node);
    const nextSection = {
      id: `section-${Date.now()}`,
      type: "section",
      content: [
        {
          id: `text-${Date.now()}`,
          type: "text",
          content: `New section ${Date.now()}`,
        },
      ],
    };

    const nextContent = [...content];

    if (index === -1) {
      nextContent.push(nextSection);
    } else {
      const insertionIndex = position === "before" ? index : index + 1;
      nextContent.splice(insertionIndex, 0, nextSection);
    }

    this.pageConfig = {
      ...this.pageConfig,
      content: nextContent,
    };

    try {
      await this.savePageConfig(this.pageConfig);
    } catch (error) {
      console.error(error);
    }
  }

  onContentChanged = async (node, newContent) => {
    console.log("Text changed:", newContent);
    node.content = newContent;

    try {
      await this.savePageConfig(this.pageConfig);
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
            this.addSectionAfter.bind(this),
            this.onContentChanged.bind(this),
            renderNode,
          ),
        )}
      </div>
    </div>`;
  }
}

customElements.define("website-editor", WebsiteEditor);
