import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import { OwbShared, defaultSharedConfig } from "./shared.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

export { defaultSharedConfig };

OwbShared.styles = [].concat(OwbShared.styles || [], unsafeCSS(blocksStyles));

installEditorPlugin(OwbShared, {
  onUpdated(element, changedProperties) {
    if (!changedProperties.has("node")) {
      return;
    }
    element.loadComponentIfNeeded();
  },

  onConnected(element) {
    element.loadComponentIfNeeded();
    void element.loadSharedComponentOptions();
  },

  onPointerDown(element) {
    if (EditorComponent.activeSettingsOwner === element) {
      return;
    }

    EditorComponent.openFor(element, {
      defaultState: {
        shared_component_id: "",
      },
      tabs: [{ id: "general", label: "General" }],
      content: () => {
        const editor = EditorComponent.instance;
        const currentId = String(editor.shared_component_id || "").trim();
        const options = element.sharedComponentOptions;
        const hasCurrent = options.some((option) => option.value === currentId);
        const baseOptions = hasCurrent
          ? options
          : [
              ...options,
              ...(currentId
                ? [{ label: `Current (${currentId})`, value: currentId }]
                : []),
            ];
        const selectOptions = [
          { label: "Select one...", value: "" },
          ...baseOptions,
        ];

        return html`
          <settings-section title="Shared component">
            <editor-select
              label="Component"
              .value=${currentId}
              .options=${selectOptions}
              @change=${(event) => {
                editor.updateGlobalSettingsState({
                  shared_component_id: event.detail.value,
                });
                element.loadComponentIfNeeded();
              }}
            ></editor-select>
            <editor-btn
              class="edit-shared-component-button"
              style="light"
              @click=${() => {
                element.navigateToSharedEditor(currentId);
                EditorComponent.instance?.closeSettingsEditor?.();
              }}
              ?disabled=${!currentId}
            >
              Edit Shared Component
            </editor-btn>
          </settings-section>
        `;
      },
    });
  },
});

export const editorRenderShared = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-shared
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .renderNode=${renderNode}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-shared>`;
};
