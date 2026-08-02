import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import { dataLayer } from "../../../editor/data/data-layer.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

import { OwbNavbar } from "./navbar.js";

OwbNavbar.styles = [unsafeCSS(blocksStyles)];

// ── Helpers ──────────────────────────────────────────────────────────────────

function createLinkId() {
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const bool = (v) => v === true || v === "true";

const FONT_WEIGHT_OPTIONS = [
  { label: "Thin (100)", value: "100" },
  { label: "Light (300)", value: "300" },
  { label: "Regular (400)", value: "400" },
  { label: "Medium (500)", value: "500" },
  { label: "Semi-bold (600)", value: "600" },
  { label: "Bold (700)", value: "700" },
  { label: "Extra-bold (800)", value: "800" },
];

const MOBILE_TYPE_OPTIONS = [
  { label: "Top dropdown", value: "dropdown" },
  { label: "Fullscreen overlay", value: "fullscreen" },
];

const ALIGN_H_OPTIONS = [
  { label: "Left", value: "flex-start" },
  { label: "Center", value: "center" },
  { label: "Right", value: "flex-end" },
];

const ALIGN_V_OPTIONS = [
  { label: "Top", value: "flex-start" },
  { label: "Middle", value: "center" },
  { label: "Bottom", value: "flex-end" },
];

const DEFAULT_SETTINGS = {
  navbarFontFamily: "",
  navbarFontSize: "",
  navbarFontWeight: "",
  navbarColor: "",
  navbarGap: "24px",
  navbarHoverColor: "",
  navbarUnderlineOnHover: false,
  navbarUnderlineActive: false,
  navbarMobileEnabled: false,
  navbarMobileType: "dropdown",
  navbarMobileBackgroundColor: "#ffffff",
  navbarMobileTextColor: "",
  navbarMobileAlignH: "center",
  navbarMobileAlignV: "center",
  navbarMobileFontSize: "",
  navbarMobileFontWeight: "",
  navbarMobileGap: "24px",
  navbarMobileBreakpoint: "768px",
  navbarMobilePadding: "32px",
  navbarMobileMenuIcon: "hamburger",
  navbarMobileMenuIconSize: "",
};

// ── Link tree helpers ─────────────────────────────────────────────────────────

function updateLinksInTree(nodes, targetId, nextLinks) {
  return nodes.map((n) => {
    if (n?.id === targetId && n?.type === "navbar") {
      return { ...n, links: nextLinks };
    }
    if (Array.isArray(n?.content)) {
      return {
        ...n,
        content: updateLinksInTree(n.content, targetId, nextLinks),
      };
    }
    return n;
  });
}

function commitLinks(element, links) {
  element.links = links;
  if (!element.pageConfig || !element.node?.id) return;
  const nextPageConfig = {
    ...element.pageConfig,
    content: updateLinksInTree(
      Array.isArray(element.pageConfig.content)
        ? element.pageConfig.content
        : [],
      element.node.id,
      links,
    ),
  };
  element.node = { ...element.node, links };
  element.pageConfig = nextPageConfig;
  element.dispatchPageConfigUpdated(nextPageConfig);
  // Refresh the settings overlay
  const editor = EditorComponent.instance;
  if (editor && EditorComponent.activeSettingsOwner === element) {
    editor.updateSettingsState({});
  }
}

async function loadPageOptions(element) {
  try {
    const pages = await dataLayer.listPages();
    element._pageOptions = (pages || []).map((p) => ({
      label: p.title || p.id || p.url,
      value: p.url || p.id,
    }));
    if (!element._addLinkPageId && element._pageOptions.length > 0) {
      element._addLinkPageId = element._pageOptions[0].value;
    }
  } catch {
    element._pageOptions = [];
  }
  // Refresh overlay with loaded pages
  const editor = EditorComponent.instance;
  if (editor && EditorComponent.activeSettingsOwner === element) {
    editor.updateSettingsState({});
  }
}

function addLink(element) {
  const label = (element._addLinkLabel || "").trim();
  let link;
  if (element._addLinkType === "page") {
    const page = (element._pageOptions || []).find(
      (p) => p.value === element._addLinkPageId,
    );
    link = {
      id: createLinkId(),
      type: "page",
      label: label || page?.label || element._addLinkPageId,
      pageId: element._addLinkPageId,
      url: element._addLinkPageId,
      target: "_self",
    };
  } else {
    link = {
      id: createLinkId(),
      type: "custom",
      label: label || element._addLinkUrl,
      url: element._addLinkUrl,
      target: element._addLinkTarget,
    };
  }
  element._addingLink = false;
  element._addLinkLabel = "";
  element._addLinkUrl = "";
  commitLinks(element, [...element.links, link]);
}

// ── Settings content renderers ────────────────────────────────────────────────

function renderLinksTab(element) {
  const editor = EditorComponent.instance;
  return html`
    <style>
      ${styles}
    </style>
    <settings-section title="Links">
      ${
        element.links.length === 0
          ? html`<p style="font-size:13px;color:#888;margin:0 0 4px;">
              No links yet. Add your first link below.
            </p>`
          : element.links.map(
              (link, index) => html`
                <div class="navbar-link-item">
                  <span class="navbar-link-item-label"
                    >${link.label || link.url || link.pageId}</span
                  >
                  <span class="navbar-link-item-badge"
                    >${
                      link.type === "page"
                        ? "page"
                        : link.target === "_blank"
                          ? "ext"
                          : "url"
                    }</span
                  >
                  ${
                    index > 0
                      ? html`<editor-btn
                          data-style="light"
                          @click=${() => {
                          const next = [...element.links];
                          [next[index - 1], next[index]] = [
                            next[index],
                            next[index - 1],
                          ];
                          commitLinks(element, next);
                        }}
                          >↑</editor-btn
                        >`
                      : null
                  }
                  ${
                    index < element.links.length - 1
                      ? html`<editor-btn
                          data-style="light"
                          @click=${() => {
                          const next = [...element.links];
                          [next[index], next[index + 1]] = [
                            next[index + 1],
                            next[index],
                          ];
                          commitLinks(element, next);
                        }}
                          >↓</editor-btn
                        >`
                      : null
                  }
                  <editor-btn
                    data-style="light danger"
                    @click=${() =>
                      commitLinks(
                        element,
                        element.links.filter((l) => l.id !== link.id),
                      )}
                    >✕</editor-btn
                  >
                </div>
              `,
            )
      }
    </settings-section>
    ${
      element._addingLink
        ? html`
            <settings-section title="New link">
              <div class="navbar-add-form">
                <editor-select
                  label="Type"
                  .value=${element._addLinkType}
                  .options=${[
                    { label: "Existing page", value: "page" },
                    { label: "Custom URL", value: "custom" },
                  ]}
                  @change=${(e) => {
                    element._addLinkType = e.detail.value;
                    editor?.updateSettingsState({});
                  }}
                ></editor-select>
                ${
                  element._addLinkType === "page"
                    ? html`
                        <editor-select
                          label="Page"
                          .value=${element._addLinkPageId}
                          .options=${
                          (element._pageOptions || []).length > 0
                            ? element._pageOptions
                            : [{ label: "Loading…", value: "" }]
                        }
                          @change=${(e) => {
                          element._addLinkPageId = e.detail.value;
                        }}
                        ></editor-select>
                      `
                    : html`
                        <editor-text-input
                          label="URL"
                          placeholder="https://..."
                          .value=${element._addLinkUrl}
                          @change=${(e) => {
                          element._addLinkUrl = e.detail.value;
                        }}
                        ></editor-text-input>
                        <editor-select
                          label="Open in"
                          .value=${element._addLinkTarget}
                          .options=${[
                          { label: "Same tab", value: "_self" },
                          { label: "New tab", value: "_blank" },
                        ]}
                          @change=${(e) => {
                          element._addLinkTarget = e.detail.value;
                        }}
                        ></editor-select>
                      `
                }
                <editor-text-input
                  label="Label (optional)"
                  placeholder="Link label"
                  .value=${element._addLinkLabel}
                  @change=${(e) => {
                    element._addLinkLabel = e.detail.value;
                  }}
                ></editor-text-input>
                <div class="navbar-add-form-actions">
                  <editor-btn
                    data-style="primary"
                    @click=${() => addLink(element)}
                    >Add link</editor-btn
                  >
                  <editor-btn
                    data-style="light"
                    @click=${() => {
                      element._addingLink = false;
                      editor?.updateSettingsState({});
                    }}
                    >Cancel</editor-btn
                  >
                </div>
              </div>
            </settings-section>
          `
        : html`
            <editor-btn
              data-style="primary"
              @click=${() => {
                element._addingLink = true;
                element._addLinkType = "page";
                element._addLinkLabel = "";
                element._addLinkUrl = "";
                element._addLinkPageId =
                  (element._pageOptions || [])[0]?.value || "";
                element._addLinkTarget = "_self";
                editor?.updateSettingsState({});
              }}
              >＋ Add link</editor-btn
            >
          `
    }
  `;
}

function renderDesignTab(editor) {
  return html`
    <settings-section title="Typography">
      <editor-text-input
        label="Font family"
        placeholder="Inherit"
        .value=${editor.navbarFontFamily}
        @change=${(e) =>
          editor.updateResponsiveSettingsState({
            navbarFontFamily: e.detail.value,
          })}
      ></editor-text-input>
      <editor-text-input
        label="Font size"
        placeholder="Inherit"
        .value=${editor.navbarFontSize}
        @change=${(e) =>
          editor.updateResponsiveSettingsState({
            navbarFontSize: e.detail.value,
          })}
      ></editor-text-input>
      <editor-select
        label="Font weight"
        .value=${String(editor.navbarFontWeight || "")}
        .options=${[{ label: "Inherit", value: "" }, ...FONT_WEIGHT_OPTIONS]}
        @change=${(e) =>
          editor.updateResponsiveSettingsState({
            navbarFontWeight: e.detail.value,
          })}
      ></editor-select>
      <editor-text-input
        label="Color"
        placeholder="Inherit"
        .value=${editor.navbarColor}
        @change=${(e) =>
          editor.updateResponsiveSettingsState({
            navbarColor: e.detail.value,
          })}
      ></editor-text-input>
      <editor-text-input
        label="Hover color"
        placeholder="Inherit"
        .value=${editor.navbarHoverColor}
        @change=${(e) =>
          editor.updateResponsiveSettingsState({
            navbarHoverColor: e.detail.value,
          })}
      ></editor-text-input>
      <editor-select
        label="Underline on hover"
        .value=${String(bool(editor.navbarUnderlineOnHover))}
        .options=${[
          { label: "No", value: "false" },
          { label: "Yes", value: "true" },
        ]}
        @change=${(e) =>
          editor.updateResponsiveSettingsState({
            navbarUnderlineOnHover: e.detail.value === "true",
          })}
      ></editor-select>
      <editor-select
        label="Underline active page"
        .value=${String(bool(editor.navbarUnderlineActive))}
        .options=${[
          { label: "No", value: "false" },
          { label: "Yes", value: "true" },
        ]}
        @change=${(e) =>
          editor.updateResponsiveSettingsState({
            navbarUnderlineActive: e.detail.value === "true",
          })}
      ></editor-select>
    </settings-section>
    <settings-section title="Layout">
      <editor-text-input
        label="Gap between links"
        placeholder="24px"
        .value=${editor.navbarGap}
        @change=${(e) =>
          editor.updateResponsiveSettingsState({ navbarGap: e.detail.value })}
      ></editor-text-input>
    </settings-section>
  `;
}

function renderMobileTab(editor) {
  const mobileOn = bool(editor.navbarMobileEnabled);
  return html`
    <settings-section title="Mobile menu">
      <editor-select
        label="Enable mobile menu"
        .value=${String(mobileOn)}
        .options=${[
          { label: "No", value: "false" },
          { label: "Yes", value: "true" },
        ]}
        @change=${(e) =>
          editor.updateGlobalSettingsState({
            navbarMobileEnabled: e.detail.value === "true",
          })}
      ></editor-select>
    </settings-section>
    ${
      mobileOn
        ? html`
            <settings-section title="Menu style">
              <editor-select
                label="Menu type"
                .value=${editor.navbarMobileType}
                .options=${MOBILE_TYPE_OPTIONS}
                @change=${(e) =>
                  editor.updateGlobalSettingsState({
                    navbarMobileType: e.detail.value,
                  })}
              ></editor-select>
              <editor-text-input
                label="Breakpoint"
                placeholder="768px"
                .value=${editor.navbarMobileBreakpoint}
                @change=${(e) =>
                  editor.updateGlobalSettingsState({
                    navbarMobileBreakpoint: e.detail.value,
                  })}
              ></editor-text-input>
              <editor-text-input
                label="Menu icon"
                placeholder="hamburger"
                .value=${editor.navbarMobileMenuIcon}
                @change=${(e) =>
                  editor.updateGlobalSettingsState({
                    navbarMobileMenuIcon: e.detail.value,
                  })}
              ></editor-text-input>
              <editor-text-input
                label="Menu icon size"
                placeholder="1.5rem"
                .value=${editor.navbarMobileMenuIconSize}
                @change=${(e) =>
                  editor.updateResponsiveSettingsState({
                    navbarMobileMenuIconSize: e.detail.value,
                  })}
              ></editor-text-input>
            </settings-section>
            <settings-section title="Menu appearance">
              <editor-text-input
                label="Background color"
                placeholder="#ffffff"
                .value=${editor.navbarMobileBackgroundColor}
                @change=${(e) =>
                  editor.updateResponsiveSettingsState({
                    navbarMobileBackgroundColor: e.detail.value,
                  })}
              ></editor-text-input>
              <editor-text-input
                label="Text color"
                placeholder="Inherit"
                .value=${editor.navbarMobileTextColor}
                @change=${(e) =>
                  editor.updateResponsiveSettingsState({
                    navbarMobileTextColor: e.detail.value,
                  })}
              ></editor-text-input>
              <editor-select
                label="Horizontal alignment"
                .value=${editor.navbarMobileAlignH}
                .options=${ALIGN_H_OPTIONS}
                @change=${(e) =>
                  editor.updateResponsiveSettingsState({
                    navbarMobileAlignH: e.detail.value,
                  })}
              ></editor-select>
              <editor-select
                label="Vertical alignment"
                .value=${editor.navbarMobileAlignV}
                .options=${ALIGN_V_OPTIONS}
                @change=${(e) =>
                  editor.updateResponsiveSettingsState({
                    navbarMobileAlignV: e.detail.value,
                  })}
              ></editor-select>
              <editor-text-input
                label="Padding"
                placeholder="32px"
                .value=${editor.navbarMobilePadding}
                @change=${(e) =>
                  editor.updateResponsiveSettingsState({
                    navbarMobilePadding: e.detail.value,
                  })}
              ></editor-text-input>
            </settings-section>
            <settings-section title="Menu typography">
              <editor-text-input
                label="Font size"
                placeholder="Inherit"
                .value=${editor.navbarMobileFontSize}
                @change=${(e) =>
                  editor.updateResponsiveSettingsState({
                    navbarMobileFontSize: e.detail.value,
                  })}
              ></editor-text-input>
              <editor-select
                label="Font weight"
                .value=${String(editor.navbarMobileFontWeight || "")}
                .options=${[
                  { label: "Inherit", value: "" },
                  ...FONT_WEIGHT_OPTIONS,
                ]}
                @change=${(e) =>
                  editor.updateResponsiveSettingsState({
                    navbarMobileFontWeight: e.detail.value,
                  })}
              ></editor-select>
              <editor-text-input
                label="Gap between links"
                placeholder="24px"
                .value=${editor.navbarMobileGap}
                @change=${(e) =>
                  editor.updateResponsiveSettingsState({
                    navbarMobileGap: e.detail.value,
                  })}
              ></editor-text-input>
            </settings-section>
          `
        : null
    }
  `;
}

// ── Editor plugin ─────────────────────────────────────────────────────────────

installEditorPlugin(OwbNavbar, {
  onUpdated(element, changedProperties) {
    if (!changedProperties.has("node")) return;
    element.links = Array.isArray(element.node?.links)
      ? [...element.node.links]
      : [];
    element.settings = element.node?.settings ?? {};
  },

  onPointerDown(element) {
    if (EditorComponent.activeSettingsOwner === element) return;
    // Initialize transient UI state
    element._pageOptions = element._pageOptions ?? [];
    element._addingLink = element._addingLink ?? false;
    element._addLinkType = element._addLinkType ?? "page";
    element._addLinkLabel = element._addLinkLabel ?? "";
    element._addLinkUrl = element._addLinkUrl ?? "";
    element._addLinkPageId = element._addLinkPageId ?? "";
    element._addLinkTarget = element._addLinkTarget ?? "_self";
    loadPageOptions(element);

    EditorComponent.openFor(element, {
      defaultState: DEFAULT_SETTINGS,
      tabs: [
        { id: "links", label: "Links" },
        { id: "design", label: "Design" },
        { id: "mobile", label: "Mobile" },
      ],
      content: (tab) => {
        const editor = EditorComponent.instance;
        if (tab === "links") return renderLinksTab(element);
        if (tab === "design") return renderDesignTab(editor);
        if (tab === "mobile") return renderMobileTab(editor);
        return html``;
      },
    });
  },

  onConnected(element) {
    element._pageOptions = [];
    element._addingLink = false;
    element._addLinkType = "page";
    element._addLinkLabel = "";
    element._addLinkUrl = "";
    element._addLinkPageId = "";
    element._addLinkTarget = "_self";
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
      OwbNavbar.editorPlugin?.onPointerDown?.(element);
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

// ── Render function ────────────────────────────────────────────────────────────

export const editorRenderNavbar = (
  node,
  pageConfig,
  onPageConfigUpdated,
  _renderNode,
  renderOptions = {},
) => {
  return html`<owb-navbar
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-navbar>`;
};

// ── Registration ──────────────────────────────────────────────────────────────

if (!customElements.get("owb-navbar")) {
  customElements.define("owb-navbar", OwbNavbar);
}
