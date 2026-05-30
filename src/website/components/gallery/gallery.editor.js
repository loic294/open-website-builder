import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import { OwbGallery, defaultGalleryConfig } from "./gallery.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

export { defaultGalleryConfig };

OwbGallery.styles = [].concat(OwbGallery.styles || [], unsafeCSS(blocksStyles));

const FORMAT_OPTIONS = [
  { label: "Square", value: "1 / 1" },
  { label: "3x2", value: "3 / 2" },
  { label: "4x3", value: "4 / 3" },
  { label: "16x9", value: "16 / 9" },
  { label: "2x3", value: "2 / 3" },
  { label: "3x4", value: "3 / 4" },
  { label: "9x16", value: "9 / 16" },
];

// ---------------------------------------------------------------------------
// Helper: recursively update images on a node in the content tree
// ---------------------------------------------------------------------------
function updateImagesInTree(nodes, targetNodeId, nextImages) {
  return nodes.map((currentNode) => {
    if (currentNode?.id === targetNodeId && currentNode?.type === "gallery") {
      return { ...currentNode, images: nextImages };
    }
    if (Array.isArray(currentNode?.content)) {
      return {
        ...currentNode,
        content: updateImagesInTree(
          currentNode.content,
          targetNodeId,
          nextImages,
        ),
      };
    }
    return currentNode;
  });
}

function updateGalleryImages(element, nextImages) {
  element.images = nextImages;
  if (!element.pageConfig || !element.node?.id) return;
  const nextContent = updateImagesInTree(
    Array.isArray(element.pageConfig.content) ? element.pageConfig.content : [],
    element.node.id,
    nextImages,
  );
  element.node = { ...element.node, images: nextImages };
  const nextPageConfig = { ...element.pageConfig, content: nextContent };
  element.pageConfig = nextPageConfig;
  element.dispatchPageConfigUpdated(nextPageConfig);
}

// ---------------------------------------------------------------------------
// Editor plugin
// ---------------------------------------------------------------------------
installEditorPlugin(OwbGallery, {
  onUpdated(element, changedProperties) {
    if (!changedProperties.has("node")) return;
    element.images = Array.isArray(element.node?.images)
      ? element.node.images
      : [];
    element.settings = element.node?.settings ?? {};
  },

  onPointerDown(element) {
    if (EditorComponent.activeSettingsOwner === element) return;
    EditorComponent.openFor(element, {
      defaultState: {
        galleryColumns: 3,
        galleryFormat: "1 / 1",
        galleryGap: "8px",
      },
      tabs: [{ id: "general", label: "General" }],
      content: () => {
        const editor = EditorComponent.instance;
        return html`
          <settings-section title="Photos">
            <textarea
              class="gallery-textarea"
              .value=${element.images.join("\n")}
              placeholder="One image URL per line"
              @input=${(event) => {
                const nextImages = String(event.target.value || "")
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean);
                updateGalleryImages(element, nextImages);
              }}
            ></textarea>
          </settings-section>
          <settings-section
            title="Layout"
            ?overridden=${editor.hasAnyOverriddenKeys(
              "galleryColumns",
              "galleryFormat",
              "galleryGap",
            )}
          >
            <editor-text-input
              type="number"
              label="Columns"
              min="1"
              max="12"
              .value=${String(editor.galleryColumns)}
              @change=${(event) =>
                editor.updateSettingsState({
                  galleryColumns: Math.max(
                    1,
                    Math.min(12, Number.parseInt(event.detail.value, 10) || 1),
                  ),
                })}
            ></editor-text-input>
            <editor-select
              label="Picture format"
              .value=${editor.galleryFormat}
              .options=${FORMAT_OPTIONS}
              @change=${(event) =>
                editor.updateSettingsState({
                  galleryFormat: event.detail.value,
                })}
            ></editor-select>
            <editor-text-input
              label="Gap"
              placeholder="8px"
              .value=${editor.galleryGap}
              @change=${(event) =>
                editor.updateSettingsState({ galleryGap: event.detail.value })}
            ></editor-text-input>
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
      OwbGallery.editorPlugin?.onPointerDown?.(element);
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
// Render function — returns owb-gallery directly (no site-gallery wrapper)
// ---------------------------------------------------------------------------
export const editorRenderGallery = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-gallery
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-gallery>`;
};

if (!customElements.get("owb-gallery")) {
  customElements.define("owb-gallery", OwbGallery);
}
