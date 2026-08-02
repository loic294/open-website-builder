import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import { OwbSlider, defaultSliderConfig } from "./slider.js";
import { getImageSize, IMAGE_SIZE_OPTIONS } from "../../utils/image-size.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

export { defaultSliderConfig };

OwbSlider.styles = [].concat(OwbSlider.styles || [], unsafeCSS(blocksStyles));

const FORMAT_OPTIONS = [
  { label: "Original", value: "auto" },
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
    if (currentNode?.id === targetNodeId && currentNode?.type === "slider") {
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

function updateSliderImages(element, nextImages) {
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
installEditorPlugin(OwbSlider, {
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
        sliderFormat: "3 / 2",
        sliderItemWidth: "80%",
        sliderHeight: "400px",
        sliderGap: "12px",
        sliderImageSize: "original",
      },
      tabs: [{ id: "general", label: "General" }],
      content: () => {
        const editor = EditorComponent.instance;
        return html`
          <settings-section title="Photos">
            <editor-select
              label="Image size"
              .value=${getImageSize(editor.sliderImageSize)}
              .options=${IMAGE_SIZE_OPTIONS}
              @change=${(event) =>
                editor.updateGlobalSettingsState({
                  sliderImageSize: getImageSize(event.detail.value),
                })}
            ></editor-select>
            <textarea
              class="slider-textarea"
              .value=${element.images.join("\n")}
              placeholder="One image URL per line"
              @input=${(event) => {
                const nextImages = String(event.target.value || "")
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean);
                updateSliderImages(element, nextImages);
              }}
            ></textarea>
          </settings-section>
          <settings-section
            title="Layout"
            ?overridden=${editor.hasAnyOverriddenKeys(
              "sliderFormat",
              "sliderItemWidth",
              "sliderHeight",
              "sliderGap",
            )}
          >
            <editor-select
              label="Picture format"
              .value=${editor.sliderFormat}
              .options=${FORMAT_OPTIONS}
              @change=${(event) =>
                editor.updateResponsiveSettingsState({
                  sliderFormat: event.detail.value,
                })}
            ></editor-select>
            ${
              editor.sliderFormat === "auto"
                ? html`
                    <editor-text-input
                      label="Height"
                      placeholder="400px"
                      .value=${editor.sliderHeight}
                      @change=${(event) =>
                        editor.updateResponsiveSettingsState({
                          sliderHeight: event.detail.value,
                        })}
                    ></editor-text-input>
                  `
                : html`
                    <editor-text-input
                      label="Item width"
                      placeholder="80%"
                      .value=${editor.sliderItemWidth}
                      @change=${(event) =>
                        editor.updateResponsiveSettingsState({
                          sliderItemWidth: event.detail.value,
                        })}
                    ></editor-text-input>
                  `
            }
            <editor-text-input
              label="Gap"
              placeholder="12px"
              .value=${editor.sliderGap}
              @change=${(event) =>
                editor.updateResponsiveSettingsState({
                  sliderGap: event.detail.value,
                })}
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
      OwbSlider.editorPlugin?.onPointerDown?.(element);
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
// Render function — returns owb-slider directly (no site-slider wrapper)
// ---------------------------------------------------------------------------
export const editorRenderSlider = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-slider
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-slider>`;
};

if (!customElements.get("owb-slider")) {
  customElements.define("owb-slider", OwbSlider);
}
