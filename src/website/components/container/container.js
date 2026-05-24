import { LitElement, html, css, unsafeCSS } from "lit";
import {
  SiteLayoutContainerBase,
  defaultSectionConfig,
} from "../site-section/site-section.js";
import sectionStyles from "../site-section/styles.css?inline";

export const defaultContainerConfig = {
  ...defaultSectionConfig,
  type: "container",
};

class SiteContainer extends SiteLayoutContainerBase {
  static styles = [super.styles, unsafeCSS(sectionStyles)];
}

class OwbContainer extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
      }

      .container {
        margin: 0 auto;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.renderRoot
      .querySelectorAll("script[data-owb-config]")
      .forEach((el) => {
        el.remove();
      });
  }

  render() {
    return html`<div class="container"><slot></slot></div>`;
  }
}

export const editorRenderContainer = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-container
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .renderNodeFn=${renderNode}
    .onPageConfigUpdated=${onPageConfigUpdated}
    @page-config-updated=${onPageConfigUpdated}
  ></site-container>`;
};

if (!customElements.get("site-container")) {
  customElements.define("site-container", SiteContainer);
}

if (!customElements.get("owb-container")) {
  customElements.define("owb-container", OwbContainer);
}
