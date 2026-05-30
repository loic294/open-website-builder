import { html, unsafeCSS } from "lit";
import { SiteLayoutContainerBase } from "../site-section/site-section.js";
import sectionStyles from "../site-section/styles.css?inline";
import { OwbContainer } from "./container.js";

export { defaultContainerConfig } from "./container.js";

OwbContainer.editorPlugin = {};

class SiteContainer extends SiteLayoutContainerBase {
  static styles = [super.styles, unsafeCSS(sectionStyles)];
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
