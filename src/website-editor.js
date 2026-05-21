import { LitElement, html, css, unsafeCSS } from "lit";

import "./editor/components/button/button.js";

import "./website/components/site-section/site-section.js";
import "./website/components/text/text.js";

import baseStyle from "./website/styles/base.css?inline";

class MyElement extends LitElement {
  static properties = {
    pageConfig: { state: true },
  };

  static styles = [unsafeCSS(baseStyle), css``];

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

  async addSectionAfter(node) {
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
      nextContent.splice(index + 1, 0, nextSection);
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

  renderNode(node) {
    if (!node || typeof node !== "object") {
      return html``;
    }

    if (node.type === "section") {
      const children = Array.isArray(node.content) ? node.content : [];
      return html`<site-section
        @add-section=${(event) => {
          event.stopPropagation();
          this.addSectionAfter(node);
        }}
      >
        ${children.map((child) => this.renderNode(child))}
      </site-section>`;
    }

    if (node.type === "text") {
      return html`<site-text
        .node=${node}
        .content=${String(node.content ?? "")}
        @content-changed=${async (event) => {
          event.stopPropagation();
          console.log("Text changed:", event.detail);
          this.pageConfig = {
            ...this.pageConfig,
            content: this.pageConfig.content.map((n) => {
              if (n.id === node.id) {
                return { ...n, content: event.detail };
              }
              return n;
            }),
          };

          try {
            await this.savePageConfig(this.pageConfig);
          } catch (error) {
            console.error(error);
          }
        }}
      ></site-text>`;
    }

    return html`No content to display`;
  }

  render() {
    if (!this.pageConfig) {
      return html``;
    }

    const content = Array.isArray(this.pageConfig?.content)
      ? this.pageConfig.content
      : [];

    return html`<div class="website">
      ${content.map((node) => this.renderNode(node))}
    </div>`;
  }
}

customElements.define("website-editor", MyElement);
