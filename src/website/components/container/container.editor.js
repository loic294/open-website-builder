import { html, unsafeCSS } from "lit";
import { OwbLayoutContainerEditor } from "../site-section/site-section.js";
import sectionStyles from "../site-section/styles.css?inline";
import { OwbContainer } from "./container.js";

export { defaultContainerConfig } from "./container.js";

OwbContainer.editorPlugin = {};

class OwbContainerEditor extends OwbLayoutContainerEditor {
  static styles = [super.styles, unsafeCSS(sectionStyles)];
}

export const editorRenderContainer = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-container-editor
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .renderNodeFn=${renderNode}
    .onPageConfigUpdated=${onPageConfigUpdated}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-container-editor>`;
};

if (!customElements.get("owb-container-editor")) {
  customElements.define("owb-container-editor", OwbContainerEditor);
}

if (!customElements.get("owb-container")) {
  customElements.define("owb-container", OwbContainer);
}
