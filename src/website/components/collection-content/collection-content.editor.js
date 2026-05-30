import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import { OwbCollectionContent } from "./collection-content.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

OwbCollectionContent.styles = [].concat(
  OwbCollectionContent.styles || [],
  unsafeCSS(blocksStyles),
);

installEditorPlugin(OwbCollectionContent, {
  onPointerDown(element) {
    if (EditorComponent.activeSettingsOwner === element) return;
    EditorComponent.openFor(element, {
      defaultState: {},
      content: html`
        <div>
          <p>
            This marker shows where a collection item's content should be
            injected when rendering a collection template.
          </p>
        </div>
      `,
    });
  },
});

export const editorRenderCollectionContent = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-collection-content
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .renderNodeFn=${renderNode}
    .onPageConfigUpdated=${onPageConfigUpdated}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-collection-content>`;
};
