import { html, unsafeCSS } from "lit";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";
import styles from "./styles.css?inline";
import { OwbSection } from "./section.js";
import {
  LayoutEditorController,
  registerLayoutEditorProperties,
} from "./layout-editor-controller.js";

// Add editor reactive properties to OwbSection (must happen before first
// instance is created — i.e. before the editor renders any section).
registerLayoutEditorProperties(OwbSection);

// Augment the runtime class's shadow-DOM styles with the editor-only sheets
// (block chrome, grid handles, section controls, etc.).
const existingStyles = Array.isArray(OwbSection.styles)
  ? OwbSection.styles
  : [OwbSection.styles];
OwbSection.styles = [
  ...existingStyles,
  unsafeCSS(blocksStyles),
  unsafeCSS(styles),
];

const SECTION_VARIANT_CONFIG = {
  variant: "section",
  shouldShowAddSectionButtons: true,
  shouldShowSectionReorderButtons: true,
  shouldShowDeleteButton: true,
  supportsReplaceWithSharedComponent: true,
};

OwbSection.editorPlugin = {
  onConnected(host) {
    if (!host._layoutEditor) {
      host._layoutEditor = new LayoutEditorController(
        host,
        SECTION_VARIANT_CONFIG,
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

export const editorRenderSection = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-section
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .renderNodeFn=${renderNode}
    .onPageConfigUpdated=${onPageConfigUpdated}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-section>`;
};
