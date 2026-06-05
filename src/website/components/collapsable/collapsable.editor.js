import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import { OwbCollapsable, defaultCollapsableConfig } from "./collapsable.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

export { defaultCollapsableConfig };

OwbCollapsable.styles = [].concat(
  OwbCollapsable.styles || [],
  unsafeCSS(blocksStyles),
);

function toBool(value) {
  if (typeof value === "boolean") return value;
  return String(value || "").toLowerCase() === "true";
}

installEditorPlugin(OwbCollapsable, {
  onUpdated(element, changedProperties) {
    if (!changedProperties.has("node")) return;
    const settings = element.node?.settings || {};
    element.settingTitle = String(settings.settingTitle ?? "Section title");
    element.settingIconStyle = String(settings.settingIconStyle ?? "chevron");
    element.settingIconPosition = String(
      settings.settingIconPosition ?? "right",
    );
    element.settingDefaultOpen = toBool(settings.settingDefaultOpen ?? true);
    element.settingTitleColor = String(settings.settingTitleColor ?? "");
    element.settingTitleBackgroundColor = String(
      settings.settingTitleBackgroundColor ?? "",
    );
    element.settingTitleBorderColor = String(
      settings.settingTitleBorderColor ?? "",
    );
    element.settings = settings;
  },

  onPointerDown(element) {
    if (EditorComponent.activeSettingsOwner === element) return;

    EditorComponent.openFor(element, {
      defaultState: {
        settingTitle: "Section title",
        settingIconStyle: "chevron",
        settingIconPosition: "right",
        settingDefaultOpen: true,
        settingTitleColor: "",
        settingTitleBackgroundColor: "",
        settingTitleBorderColor: "",
      },
      tabs: [{ id: "general", label: "General" }],
      content: () => {
        const editor = EditorComponent.instance;
        return html`
          <settings-section
            title="Title"
            ?overridden=${editor.hasAnyOverriddenKeys("settingTitle")}
          >
            <editor-text-input
              label="Title text"
              .value=${editor.settingTitle}
              @change=${(event) => {
                editor.updateSettingsState({
                  settingTitle: event.detail.value,
                });
              }}
            ></editor-text-input>
          </settings-section>

          <settings-section
            title="Icon"
            ?overridden=${editor.hasAnyOverriddenKeys(
              "settingIconStyle",
              "settingIconPosition",
            )}
          >
            <editor-select
              label="Icon style"
              .value=${editor.settingIconStyle}
              .options=${[
                { label: "Chevron", value: "chevron" },
                { label: "Plus / minus", value: "plus-minus" },
                { label: "No icon", value: "none" },
              ]}
              @change=${(event) => {
                editor.updateSettingsState({
                  settingIconStyle: event.detail.value,
                });
              }}
            ></editor-select>
            <editor-select
              label="Icon position"
              .value=${editor.settingIconPosition}
              .options=${[
                { label: "Right", value: "right" },
                { label: "Left", value: "left" },
              ]}
              @change=${(event) => {
                editor.updateSettingsState({
                  settingIconPosition: event.detail.value,
                });
              }}
            ></editor-select>
          </settings-section>

          <settings-section
            title="Behavior"
            ?overridden=${editor.hasAnyOverriddenKeys("settingDefaultOpen")}
          >
            <editor-select
              label="Default state"
              .value=${String(Boolean(editor.settingDefaultOpen))}
              .options=${[
                { label: "Open", value: "true" },
                { label: "Closed", value: "false" },
              ]}
              @change=${(event) => {
                editor.updateSettingsState({
                  settingDefaultOpen: event.detail.value === "true",
                });
              }}
            ></editor-select>
          </settings-section>

          <settings-section
            title="Title appearance"
            ?overridden=${editor.hasAnyOverriddenKeys(
              "settingTitleColor",
              "settingTitleBackgroundColor",
              "settingTitleBorderColor",
            )}
          >
            <editor-color-picker
              label="Text color"
              .value=${editor.settingTitleColor}
              @change=${(event) => {
                editor.updateSettingsState({
                  settingTitleColor: event.detail.value,
                });
              }}
            ></editor-color-picker>
            <editor-color-picker
              label="Background color"
              .value=${editor.settingTitleBackgroundColor}
              @change=${(event) => {
                editor.updateSettingsState({
                  settingTitleBackgroundColor: event.detail.value,
                });
              }}
            ></editor-color-picker>
            <editor-color-picker
              label="Border color"
              .value=${editor.settingTitleBorderColor}
              @change=${(event) => {
                editor.updateSettingsState({
                  settingTitleBorderColor: event.detail.value,
                });
              }}
            ></editor-color-picker>
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
      OwbCollapsable.editorPlugin?.onPointerDown?.(element);
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

export const editorRenderCollapsable = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  const childContainer = Array.isArray(node?.content) ? node.content[0] : null;
  return html`<owb-collapsable
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  >
    ${childContainer
      ? renderNode(childContainer, pageConfig, onPageConfigUpdated, renderNode)
      : null}
  </owb-collapsable>`;
};

if (!customElements.get("owb-collapsable")) {
  customElements.define("owb-collapsable", OwbCollapsable);
}
