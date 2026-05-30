import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import { OwbEmbed, defaultEmbedConfig } from "./embed.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

export { defaultEmbedConfig };

OwbEmbed.styles = [unsafeCSS(blocksStyles)];

// ---------------------------------------------------------------------------
// Helper: recursively update html on a node in the content tree
// ---------------------------------------------------------------------------
function updateHtmlInTree(nodes, targetNodeId, nextHtml) {
  return nodes.map((currentNode) => {
    if (currentNode?.id === targetNodeId && currentNode?.type === "embed") {
      return { ...currentNode, html: nextHtml };
    }
    if (Array.isArray(currentNode?.content)) {
      return {
        ...currentNode,
        content: updateHtmlInTree(currentNode.content, targetNodeId, nextHtml),
      };
    }
    return currentNode;
  });
}

function updateEmbedHtml(element, nextHtml) {
  element.html = nextHtml;
  if (!element.pageConfig || !element.node?.id) return;
  const nextContent = updateHtmlInTree(
    Array.isArray(element.pageConfig.content) ? element.pageConfig.content : [],
    element.node.id,
    nextHtml,
  );
  element.node = { ...element.node, html: nextHtml };
  const nextPageConfig = { ...element.pageConfig, content: nextContent };
  element.pageConfig = nextPageConfig;
  element.dispatchPageConfigUpdated(nextPageConfig);
}

// ---------------------------------------------------------------------------
// Editor plugin
// ---------------------------------------------------------------------------
installEditorPlugin(OwbEmbed, {
  onUpdated(element, changedProperties) {
    if (!changedProperties.has("node")) return;
    element.html =
      element.node && typeof element.node.html === "string"
        ? element.node.html
        : "";
    element.settings = element.node?.settings ?? {};
  },

  onPointerDown(element) {
    if (EditorComponent.activeSettingsOwner === element) return;
    EditorComponent.openFor(element, {
      tabs: [{ id: "general", label: "General" }],
      content: () => {
        return html`
          <settings-section title="Embed HTML">
            <textarea
              class="embed-textarea"
              .value=${element.html}
              placeholder="Paste any HTML embed code"
              @input=${(event) => {
                element.html = event.target.value;
              }}
              @change=${(event) => {
                updateEmbedHtml(element, event.target.value);
              }}
            ></textarea>
            <p class="embed-help">
              Scripts are stored but disabled in editor preview.
            </p>
          </settings-section>
        `;
      },
    });
  },

  onConnected(element) {
    element._onFocusNodeRequest = (event) => {
      const requestedNodeId = String(event?.detail?.nodeId || "");
      if (
        !requestedNodeId ||
        String(element.node?.id || "") !== requestedNodeId
      ) {
        return;
      }
      element.scrollIntoView({ block: "center", behavior: "smooth" });
      const editorBlock = element.renderRoot?.querySelector(
        "[data-editor-block]",
      );
      if (editorBlock instanceof HTMLElement) {
        editorBlock.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            composed: true,
            cancelable: true,
            pointerId: 1,
            isPrimary: true,
          }),
        );
        return;
      }
      OwbEmbed.editorPlugin?.onPointerDown?.(element);
    };
    window.addEventListener("owb-focus-node", element._onFocusNodeRequest);
  },

  onDisconnected(element) {
    if (element._onFocusNodeRequest) {
      window.removeEventListener("owb-focus-node", element._onFocusNodeRequest);
      element._onFocusNodeRequest = null;
    }
  },
});

// ---------------------------------------------------------------------------
// Render function — returns owb-embed directly (no site-embed wrapper)
// ---------------------------------------------------------------------------
export const editorRenderEmbed = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-embed
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-embed>`;
};

if (!customElements.get("owb-embed")) {
  customElements.define("owb-embed", OwbEmbed);
}
