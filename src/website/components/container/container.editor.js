import { html, unsafeCSS } from "lit";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";
import { OwbContainer } from "./container.js";
import {
  LayoutEditorController,
  registerLayoutEditorProperties,
} from "../site-section/layout-editor-controller.js";

export { defaultContainerConfig } from "./container.js";

registerLayoutEditorProperties(OwbContainer);

const existingStyles = Array.isArray(OwbContainer.styles)
  ? OwbContainer.styles
  : [OwbContainer.styles];
OwbContainer.styles = [...existingStyles, unsafeCSS(blocksStyles)];

const CONTAINER_VARIANT_CONFIG = {
  variant: "container",
};

OwbContainer.editorPlugin = {
  onConnected(host) {
    if (!host._layoutEditor) {
      host._layoutEditor = new LayoutEditorController(
        host,
        CONTAINER_VARIANT_CONFIG,
      );
    }
    host._layoutEditor.onConnected();
  },
  onWillUpdate(host, changedProperties) {
    host._layoutEditor?.onWillUpdate(changedProperties);
  },
  onUpdated(host, changedProperties) {
    host._layoutEditor?.onUpdated(changedProperties);
  },
  onDisconnected(host) {
    host._layoutEditor?.onDisconnected();
    host._layoutEditor = null;
  },
  render(host) {
    return host._layoutEditor?.render() ?? html``;
  },
};

export const editorRenderContainer = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-container
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .renderNodeFn=${renderNode}
    .onPageConfigUpdated=${onPageConfigUpdated}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-container>`;
};

if (!customElements.get("owb-container")) {
  customElements.define("owb-container", OwbContainer);
}
