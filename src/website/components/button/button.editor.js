import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import { OwbButton, SIZE_OPTIONS } from "./button.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

OwbButton.styles = [unsafeCSS(blocksStyles)];

// ---------------------------------------------------------------------------
// Helper: recursively update content on a node in the content tree
// ---------------------------------------------------------------------------
function updateContentInTree(nodes, targetNodeId, nextContent) {
  return nodes.map((currentNode) => {
    if (currentNode?.id === targetNodeId && currentNode?.type === "button") {
      return { ...currentNode, content: nextContent };
    }
    if (Array.isArray(currentNode?.content)) {
      return {
        ...currentNode,
        content: updateContentInTree(
          currentNode.content,
          targetNodeId,
          nextContent,
        ),
      };
    }
    return currentNode;
  });
}

function updateButtonContent(element, nextText) {
  element.content = nextText;
  if (!element.pageConfig || !element.node?.id) return;
  const nextContent = updateContentInTree(
    Array.isArray(element.pageConfig.content) ? element.pageConfig.content : [],
    element.node.id,
    nextText,
  );
  element.node = { ...element.node, content: nextText };
  const nextPageConfig = { ...element.pageConfig, content: nextContent };
  element.pageConfig = nextPageConfig;
  element.dispatchPageConfigUpdated(nextPageConfig);
}

// ---------------------------------------------------------------------------
// Editor plugin
// ---------------------------------------------------------------------------
installEditorPlugin(OwbButton, {
  onUpdated(element, changedProperties) {
    if (!changedProperties.has("node")) return;
    element.content =
      element.node && typeof element.node.content === "string"
        ? element.node.content
        : "Button";
    element.settings = element.node?.settings ?? {};
  },

  onPointerDown(element) {
    if (EditorComponent.activeSettingsOwner === element) return;
    EditorComponent.openFor(element, {
      defaultState: {
        buttonLink: "",
        buttonSize: "m",
        buttonTheme: "primary",
        buttonVariant: "filled",
        buttonType: "link",
        buttonShape: "rounded",
        buttonRadiusCustom: "12px",
        buttonPaddingTop: "",
        buttonPaddingRight: "",
        buttonPaddingBottom: "",
        buttonPaddingLeft: "",
      },
      tabs: [
        { id: "general", label: "General" },
        { id: "design", label: "Design" },
      ],
      content: (tab) => {
        const editor = EditorComponent.instance;
        if (tab === "general") {
          return html`
            <settings-section title="Content">
              <settings-section title="Content">
                <editor-text-input
                  label="Label"
                  .value=${element.content}
                  @input=${(event) => {
                    element.content = event.detail.value;
                  }}
                  @change=${(event) =>
                    updateButtonContent(element, event.detail.value)}
                ></editor-text-input>
                <editor-text-input
                  label="Link"
                  placeholder="https://example.com"
                  .value=${editor.buttonLink}
                  .disabled=${editor.buttonType !== "link"}
                  @change=${(event) =>
                    editor.updateGlobalSettingsState({
                      buttonLink: event.detail.value,
                    })}
                ></editor-text-input>
                <editor-select
                  label="Button action"
                  .value=${editor.buttonType}
                  .options=${[
                    { label: "Link", value: "link" },
                    { label: "Normal button", value: "button" },
                    { label: "Submit button", value: "submit" },
                  ]}
                  @change=${(event) =>
                    editor.updateGlobalSettingsState({
                      buttonType: event.detail.value,
                    })}
                ></editor-select>
              </settings-section>
              <settings-section
                title="Size"
                ?overridden=${editor.hasAnyOverriddenKeys(
                  "buttonSize",
                  "buttonPaddingTop",
                  "buttonPaddingRight",
                  "buttonPaddingBottom",
                  "buttonPaddingLeft",
                )}
              >
                <editor-radio-button
                  .options=${SIZE_OPTIONS}
                  .value=${editor.buttonSize}
                  @change=${(event) =>
                    editor.updateResponsiveSettingsState({
                      buttonSize: event.detail.value,
                    })}
                ></editor-radio-button>
                ${
                  editor.buttonSize === "custom"
                    ? html`
                        <editor-padding-input
                          .value=${{
                            top: editor.buttonPaddingTop,
                            right: editor.buttonPaddingRight,
                            bottom: editor.buttonPaddingBottom,
                            left: editor.buttonPaddingLeft,
                          }}
                          @change=${(event) => {
                            const value = event.detail.value || {};
                            editor.updateResponsiveSettingsState({
                              buttonPaddingTop: value.top || "",
                              buttonPaddingRight: value.right || "",
                              buttonPaddingBottom: value.bottom || "",
                              buttonPaddingLeft: value.left || "",
                            });
                          }}
                        ></editor-padding-input>
                      `
                    : null
                }
              </settings-section>
            </settings-section>
          `;
        }

        if (tab === "design") {
          return html`
            <settings-section
              title="Theme"
              ?overridden=${editor.hasAnyOverriddenKeys("buttonTheme")}
            >
              <editor-select
                label="Theme color"
                .value=${editor.buttonTheme}
                .options=${[
                  { label: "Primary", value: "primary" },
                  { label: "Secondary", value: "secondary" },
                  { label: "Light", value: "light" },
                  { label: "Dark", value: "dark" },
                  { label: "Muted", value: "muted" },
                ]}
                @change=${(event) =>
                  editor.updateResponsiveSettingsState({
                    buttonTheme: event.detail.value,
                  })}
              ></editor-select>
            </settings-section>
            <settings-section
              title="Style"
              ?overridden=${editor.hasAnyOverriddenKeys("buttonVariant")}
            >
              <editor-radio-button
                .options=${[
                  { label: "Filled", value: "filled" },
                  { label: "Border", value: "border" },
                  { label: "Ghost", value: "ghost" },
                ]}
                .value=${editor.buttonVariant}
                @change=${(event) =>
                  editor.updateResponsiveSettingsState({
                    buttonVariant: event.detail.value,
                  })}
              ></editor-radio-button>
            </settings-section>
            <settings-section
              title="Shape"
              ?overridden=${editor.hasAnyOverriddenKeys(
                "buttonShape",
                "buttonRadiusCustom",
              )}
            >
              <editor-radio-button
                .options=${[
                  { label: "Rounded", value: "rounded" },
                  { label: "Square", value: "square" },
                  { label: "Border radius", value: "custom" },
                ]}
                .value=${editor.buttonShape}
                @change=${(event) =>
                  editor.updateResponsiveSettingsState({
                    buttonShape: event.detail.value,
                  })}
              ></editor-radio-button>
              ${
                editor.buttonShape === "custom"
                  ? html`
                      <editor-text-input
                        label="Radius"
                        placeholder="12px"
                        .value=${editor.buttonRadiusCustom}
                        @change=${(event) =>
                          editor.updateResponsiveSettingsState({
                            buttonRadiusCustom: event.detail.value,
                          })}
                      ></editor-text-input>
                    `
                  : null
              }
            </settings-section>
          `;
        }

        return html``;
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
      OwbButton.editorPlugin?.onPointerDown?.(element);
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
// Render function — returns owb-button directly (no site-button wrapper)
// ---------------------------------------------------------------------------
export const editorRenderButton = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-button
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-button>`;
};

if (!customElements.get("owb-button")) {
  customElements.define("owb-button", OwbButton);
}
