import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { FileManager } from "../../../editor/components/layout/file-manager/file-manager.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import { OwbImage, getImageMode } from "./image.js";
import { getImageSize, IMAGE_SIZE_OPTIONS } from "../../utils/image-size.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

// Apply editor block styles (hover ring, is-settings-open indicator, etc.)
// to OwbImage's own shadow root so they scope correctly.
OwbImage.styles = [unsafeCSS(blocksStyles)];

// ---------------------------------------------------------------------------
// Helper: recursively update url on a node in the content tree
// ---------------------------------------------------------------------------
function updateUrlInTree(nodes, targetNodeId, nextUrl) {
  return nodes.map((currentNode) => {
    if (currentNode?.id === targetNodeId && currentNode?.type === "image") {
      return { ...currentNode, url: nextUrl };
    }
    if (Array.isArray(currentNode?.content)) {
      return {
        ...currentNode,
        content: updateUrlInTree(currentNode.content, targetNodeId, nextUrl),
      };
    }
    return currentNode;
  });
}

// ---------------------------------------------------------------------------
// Editor plugin — all editor logic lives here, no SiteImage wrapper class
// ---------------------------------------------------------------------------
const imageEditorPlugin = {
  onUpdated(element, changedProperties) {
    if (!changedProperties.has("node")) return;
    element.url =
      element.node && typeof element.node.url === "string"
        ? element.node.url
        : "";
    element.settings = element.node?.settings ?? {};
  },

  onPointerDown(element) {
    // If this element already owns the overlay, do nothing.
    if (EditorComponent.activeSettingsOwner === element) return;

    EditorComponent.openFor(element, {
      defaultState: {
        imageSizeMode: "contained",
        imageSourceSize: "original",
        imageClickAction: "none",
        imageLinkUrl: "",
        imageLinkTarget: "current",
      },
      tabs: [{ id: "general", label: "General" }],
      content: (activeTab) => {
        const editor = EditorComponent.instance;
        return html`
          <div>
            <settings-section
              title="Image"
              ?overridden=${editor.hasAnyOverriddenKeys("imageSizeMode")}
            >
              <editor-text-input
                label="URL"
                placeholder="https://example.com/image.jpg"
                .value=${element.url}
                @input=${(e) => {
                  element.url = e.detail.value;
                }}
                @change=${(e) => {
                  imageEditorPlugin._updateImageUrl(element, e.detail.value);
                }}
              ></editor-text-input>
              <button
                type="button"
                class="owb-browse-btn"
                @click=${() =>
                  FileManager.open({
                    mode: "single",
                    selected: element.url ? [element.url] : [],
                    onSelect: ([path]) => {
                      imageEditorPlugin._updateImageUrl(element, path || "");
                    },
                  })}
              >
                Browse Files…
              </button>

              <editor-select
                label="Image size"
                .value=${getImageSize(editor.imageSourceSize)}
                .options=${IMAGE_SIZE_OPTIONS}
                @change=${(event) =>
                  editor.updateGlobalSettingsState({
                    imageSourceSize: getImageSize(event.detail.value),
                  })}
              ></editor-select>

              <editor-radio-button
                .options=${[
                  { label: "Full width", value: "full-width" },
                  { label: "Contained", value: "contained" },
                  { label: "Cover", value: "cover" },
                ]}
                .value=${editor.imageSizeMode}
                @change=${(e) => {
                  const normalizedMode = getImageMode(e.detail.value);
                  const nextState = { imageSizeMode: normalizedMode };
                  if (normalizedMode === "full-width") {
                    nextState.gridRowSpan = 1;
                  }
                  editor.updateResponsiveSettingsState(nextState);
                }}
              ></editor-radio-button>
            </settings-section>

            <settings-section title="Interaction">
              <editor-radio-button
                .options=${[
                  { label: "Do nothing", value: "none" },
                  { label: "Open a link", value: "link" },
                  { label: "Open image in lightbox", value: "lightbox" },
                ]}
                .value=${editor.imageClickAction}
                @change=${(event) => {
                  editor.updateGlobalSettingsState({
                    imageClickAction: event.detail.value,
                  });
                }}
              ></editor-radio-button>

              ${
                editor.imageClickAction === "link"
                  ? html`
                      <editor-text-input
                        label="Link URL"
                        placeholder="https://example.com"
                        .value=${editor.imageLinkUrl}
                        @change=${(event) => {
                          editor.updateGlobalSettingsState({
                            imageLinkUrl: event.detail.value,
                          });
                        }}
                      ></editor-text-input>
                      <editor-radio-button
                        .options=${[
                          { label: "Open in current page", value: "current" },
                          { label: "Open in new tab", value: "new" },
                        ]}
                        .value=${editor.imageLinkTarget}
                        @change=${(event) => {
                          editor.updateGlobalSettingsState({
                            imageLinkTarget: event.detail.value,
                          });
                        }}
                      ></editor-radio-button>
                    `
                  : null
              }
            </settings-section>
          </div>
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
      imageEditorPlugin.onPointerDown(element);
    };
    window.addEventListener("owb-focus-node", element._onFocusNodeRequest);
  },

  onDisconnected(element) {
    if (element._onFocusNodeRequest) {
      window.removeEventListener("owb-focus-node", element._onFocusNodeRequest);
      element._onFocusNodeRequest = null;
    }
  },

  // Update the url field — a top-level node property, not in node.settings.
  _updateImageUrl(element, nextUrl) {
    element.url = nextUrl;
    if (!element.pageConfig || !element.node?.id) return;

    const nextContent = updateUrlInTree(
      Array.isArray(element.pageConfig.content)
        ? element.pageConfig.content
        : [],
      element.node.id,
      nextUrl,
    );

    element.node = { ...element.node, url: nextUrl };
    const nextPageConfig = { ...element.pageConfig, content: nextContent };
    element.pageConfig = nextPageConfig;
    element.dispatchPageConfigUpdated(nextPageConfig);

    // Re-render the overlay so the URL input reflects the committed value.
    EditorComponent.instance?.renderSettingsOverlay();
  },
};

installEditorPlugin(OwbImage, imageEditorPlugin);

// ---------------------------------------------------------------------------
// Render function — returns owb-image directly (no site-image wrapper)
// ---------------------------------------------------------------------------
export const editorRenderImage = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-image
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-image>`;
};

if (!customElements.get("owb-image")) {
  customElements.define("owb-image", OwbImage);
}
