import { html, unsafeCSS } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { Globe, Plus, Trash, createElement } from "lucide";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import {
  OwbSocialMedia,
  defaultSocialMediaConfig,
  normalizeIconSlug,
  getSocialButtonShapeRadius,
  SIMPLE_ICON_MAP,
  SIMPLE_ICON_LIBRARY,
  FEATURED_ICONS,
} from "./social-media.js";
import styles from "./styles.css?inline";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

export { defaultSocialMediaConfig };

OwbSocialMedia.styles = [unsafeCSS(blocksStyles), unsafeCSS(styles)];

// ---------------------------------------------------------------------------
// Helpers: update items in the content tree
// ---------------------------------------------------------------------------
function updateItemsInTree(nodes, targetNodeId, nextItems) {
  return nodes.map((currentNode) => {
    if (
      currentNode?.id === targetNodeId &&
      currentNode?.type === "social-media"
    ) {
      return { ...currentNode, items: nextItems };
    }
    if (Array.isArray(currentNode?.content)) {
      return {
        ...currentNode,
        content: updateItemsInTree(
          currentNode.content,
          targetNodeId,
          nextItems,
        ),
      };
    }
    return currentNode;
  });
}

function commitItems(element, nextItems) {
  element.items = nextItems;
  if (!element.pageConfig || !element.node?.id) return;
  const nextContent = updateItemsInTree(
    Array.isArray(element.pageConfig.content) ? element.pageConfig.content : [],
    element.node.id,
    nextItems,
  );
  element.node = { ...element.node, items: nextItems };
  const nextPageConfig = { ...element.pageConfig, content: nextContent };
  element.pageConfig = nextPageConfig;
  element.dispatchPageConfigUpdated(nextPageConfig);
  // Refresh the settings overlay
  const editor = EditorComponent.instance;
  if (editor && EditorComponent.activeSettingsOwner === element) {
    editor.updateSettingsState({});
  }
}

function getTextInputEventValue(event) {
  if (typeof event?.detail?.value === "string") return event.detail.value;
  if (typeof event?.target?.value === "string") return event.target.value;
  return "";
}

function renderSimpleIcon(icon, sizeClass = "", colorMode = "brand") {
  if (!icon) {
    return html`<span class="social-fallback-icon ${sizeClass}"
      >${createElement(Globe)}</span
    >`;
  }
  const useTextColor = colorMode === "text";
  return html`<span
    class="simple-icon ${sizeClass} ${useTextColor ? "use-text-color" : ""}"
    style=${`--simple-icon-color: #${icon.hex || "777777"};`}
    >${unsafeHTML(icon.svg)}</span
  >`;
}

function getFilteredIconResults(iconSearchQuery) {
  const query = String(iconSearchQuery || "")
    .trim()
    .toLowerCase();
  const source = query ? SIMPLE_ICON_LIBRARY : FEATURED_ICONS;
  const filtered = query
    ? source.filter(
        (icon) =>
          icon.title.toLowerCase().includes(query) ||
          icon.slug.toLowerCase().includes(query),
      )
    : source;
  return filtered.slice(0, 300);
}

function renderIconPicker(item, element) {
  const results = getFilteredIconResults(element._iconSearchQuery);
  const currentSlug = normalizeIconSlug(item?.icon);
  const editor = EditorComponent.instance;

  return html`
    <div
      class="social-icon-picker-panel"
      @click=${(event) => event.stopPropagation()}
    >
      <div class="social-icon-picker-search-row">
        <editor-text-input
          label="Search icons"
          placeholder="github, linkedin, youtube..."
          .value=${element._iconSearchQuery}
          @input=${(event) => {
            element._iconSearchQuery = getTextInputEventValue(event);
            editor?.updateSettingsState({});
          }}
          @change=${(event) => {
            element._iconSearchQuery = getTextInputEventValue(event);
            editor?.updateSettingsState({});
          }}
        ></editor-text-input>
      </div>
      <div
        class="social-icon-picker-grid"
        role="listbox"
        aria-label="Platform icons"
      >
        ${results.map((icon) => {
          const isActive = currentSlug === icon.slug;
          return html`
            <button
              type="button"
              class="social-icon-option ${isActive ? "is-active" : ""}"
              title=${icon.title}
              aria-label=${icon.title}
              @click=${() => {
                const nextItems = element.items.map((i) =>
                  i.id === item.id ? { ...i, icon: icon.slug } : i,
                );
                commitItems(element, nextItems);
                element._activeIconPickerItemId = "";
                element._iconSearchQuery = "";
                editor?.updateSettingsState({});
              }}
            >
              ${renderSimpleIcon(icon, "is-small")}
            </button>
          `;
        })}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Editor plugin
// ---------------------------------------------------------------------------
installEditorPlugin(OwbSocialMedia, {
  onUpdated(element, changedProperties) {
    if (!changedProperties.has("node")) return;
    element.items = Array.isArray(element.node?.items)
      ? element.node.items.map((item) => ({ ...item }))
      : [];
    element.settings = element.node?.settings ?? {};
  },

  onPointerDown(element) {
    if (EditorComponent.activeSettingsOwner === element) return;
    // Initialize transient UI state
    element._activeIconPickerItemId = element._activeIconPickerItemId ?? "";
    element._iconSearchQuery = element._iconSearchQuery ?? "";

    EditorComponent.openFor(element, {
      defaultState: {
        socialDisplayMode: "icon-text",
        socialButtonTheme: "primary",
        socialButtonVariant: "filled",
        socialButtonSize: "medium",
        socialButtonAlignment: "left",
        socialButtonShape: "rounded",
        socialButtonRadiusCustom: "12px",
        socialIconColorMode: "brand",
      },
      tabs: [
        { id: "items", label: "Items" },
        { id: "buttons", label: "Buttons" },
      ],
      content: (tab) => {
        const editor = EditorComponent.instance;

        if (tab === "items") {
          return html`
            <style>
              ${styles}
            </style>
            <settings-section title="Platforms">
              <editor-btn
                style="light"
                @click=${() => {
                  const nextItem = {
                    id: `social-item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    name: "Social",
                    link: "",
                    icon: "github",
                  };
                  element._activeIconPickerItemId = nextItem.id;
                  element._iconSearchQuery = "";
                  commitItems(element, [...element.items, nextItem]);
                }}
                >${createElement(Plus)} Add platform</editor-btn
              >
              <div class="social-settings-list">
                ${element.items.map(
                  (item, index) => html`
                    <div class="social-settings-item">
                      <div class="social-settings-item-header">
                        <strong>Platform ${index + 1}</strong>
                      </div>
                      <div class="social-name-icon-row">
                        <button
                          type="button"
                          class="social-icon-picker-trigger"
                          title="Choose icon"
                          @click=${() => {
                            if (element._activeIconPickerItemId !== item.id) {
                              element._iconSearchQuery = "";
                            }
                            element._activeIconPickerItemId =
                              element._activeIconPickerItemId === item.id
                                ? ""
                                : item.id;
                            editor?.updateSettingsState({});
                          }}
                        >
                          ${renderSimpleIcon(
                            (() => {
                              const slug = normalizeIconSlug(item?.icon);
                              return slug
                                ? SIMPLE_ICON_MAP.get(slug) || null
                                : null;
                            })(),
                            "is-medium",
                          )}
                        </button>
                        <editor-text-input
                          label="Name"
                          placeholder="GitHub"
                          .value=${item.name || ""}
                          @input=${(event) => {
                            const nextItems = element.items.map((i) =>
                              i.id === item.id
                                ? {
                                    ...i,
                                    name: getTextInputEventValue(event),
                                  }
                                : i,
                            );
                            commitItems(element, nextItems);
                          }}
                          @change=${(event) => {
                            const nextItems = element.items.map((i) =>
                              i.id === item.id
                                ? {
                                    ...i,
                                    name: getTextInputEventValue(event),
                                  }
                                : i,
                            );
                            commitItems(element, nextItems);
                          }}
                        ></editor-text-input>
                      </div>
                      ${element._activeIconPickerItemId === item.id
                        ? renderIconPicker(item, element)
                        : null}
                      <editor-text-input
                        label="Link"
                        placeholder="https://..."
                        .value=${item.link || ""}
                        @change=${(event) => {
                          const nextItems = element.items.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  link: getTextInputEventValue(event),
                                }
                              : i,
                          );
                          commitItems(element, nextItems);
                        }}
                      ></editor-text-input>
                      <div class="social-item-remove-row">
                        <button
                          type="button"
                          class="social-remove-button"
                          @click=${() => {
                            if (element._activeIconPickerItemId === item.id) {
                              element._activeIconPickerItemId = "";
                            }
                            commitItems(
                              element,
                              element.items.filter((i) => i.id !== item.id),
                            );
                          }}
                        >
                          ${createElement(Trash)} Remove platform
                        </button>
                      </div>
                    </div>
                  `,
                )}
              </div>
            </settings-section>
          `;
        }

        if (tab === "buttons") {
          return html`
            <settings-section title="Display mode">
              <settings-section
                title="Display mode"
                ?overridden=${editor.hasAnyOverriddenKeys("socialDisplayMode")}
              >
                <editor-radio-button
                  .options=${[
                    { label: "Icon + text", value: "icon-text" },
                    { label: "Icon only", value: "icon" },
                    { label: "Text only", value: "text" },
                  ]}
                  .value=${editor.socialDisplayMode}
                  @change=${(event) =>
                    editor.updateSettingsState({
                      socialDisplayMode: event.detail.value,
                    })}
                ></editor-radio-button>
              </settings-section>
              <settings-section
                title="Button style"
                ?overridden=${editor.hasAnyOverriddenKeys(
                  "socialButtonTheme",
                  "socialButtonVariant",
                  "socialButtonSize",
                  "socialButtonAlignment",
                  "socialIconColorMode",
                  "socialButtonShape",
                  "socialButtonRadiusCustom",
                )}
              >
                <editor-select
                  label="Theme"
                  .value=${editor.socialButtonTheme}
                  .options=${[
                    { label: "Primary", value: "primary" },
                    { label: "Secondary", value: "secondary" },
                    { label: "Light", value: "light" },
                    { label: "Dark", value: "dark" },
                    { label: "Muted", value: "muted" },
                  ]}
                  @change=${(event) =>
                    editor.updateSettingsState({
                      socialButtonTheme: event.detail.value,
                    })}
                ></editor-select>
                <editor-radio-button
                  .options=${[
                    { label: "Filled", value: "filled" },
                    { label: "Border", value: "border" },
                    { label: "Ghost", value: "ghost" },
                  ]}
                  .value=${editor.socialButtonVariant}
                  @change=${(event) =>
                    editor.updateSettingsState({
                      socialButtonVariant: event.detail.value,
                    })}
                ></editor-radio-button>
                <editor-radio-button
                  .options=${[
                    { label: "XS", value: "xs" },
                    { label: "Small", value: "small" },
                    { label: "Medium", value: "medium" },
                    { label: "Large", value: "large" },
                    { label: "XXL", value: "xxl" },
                  ]}
                  .value=${editor.socialButtonSize}
                  @change=${(event) =>
                    editor.updateSettingsState({
                      socialButtonSize: event.detail.value,
                    })}
                ></editor-radio-button>
                <editor-radio-button
                  .options=${[
                    { label: "Left", value: "left" },
                    { label: "Center", value: "center" },
                    { label: "Right", value: "right" },
                  ]}
                  .value=${editor.socialButtonAlignment}
                  @change=${(event) =>
                    editor.updateSettingsState({
                      socialButtonAlignment: event.detail.value,
                    })}
                ></editor-radio-button>
                <editor-radio-button
                  .options=${[
                    { label: "Brand icon color", value: "brand" },
                    { label: "Text color", value: "text" },
                  ]}
                  .value=${editor.socialIconColorMode}
                  @change=${(event) =>
                    editor.updateSettingsState({
                      socialIconColorMode: event.detail.value,
                    })}
                ></editor-radio-button>
                <editor-radio-button
                  .options=${[
                    { label: "Rounded", value: "rounded" },
                    { label: "Square", value: "square" },
                    { label: "Border radius", value: "custom" },
                  ]}
                  .value=${editor.socialButtonShape}
                  @change=${(event) =>
                    editor.updateSettingsState({
                      socialButtonShape: event.detail.value,
                    })}
                ></editor-radio-button>
                ${editor.socialButtonShape === "custom"
                  ? html`
                      <editor-text-input
                        label="Radius"
                        placeholder="12px"
                        .value=${editor.socialButtonRadiusCustom}
                        @change=${(event) =>
                          editor.updateSettingsState({
                            socialButtonRadiusCustom:
                              getTextInputEventValue(event),
                          })}
                      ></editor-text-input>
                    `
                  : null}
              </settings-section>
            </settings-section>
          `;
        }

        return html``;
      },
    });
  },

  onConnected(element) {
    element._activeIconPickerItemId = "";
    element._iconSearchQuery = "";
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
      OwbSocialMedia.editorPlugin?.onPointerDown?.(element);
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
// Render function — returns owb-social-media directly (no site-social-media wrapper)
// ---------------------------------------------------------------------------
export const editorRenderSocialMedia = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-social-media
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-social-media>`;
};

if (!customElements.get("owb-social-media")) {
  customElements.define("owb-social-media", OwbSocialMedia);
}
