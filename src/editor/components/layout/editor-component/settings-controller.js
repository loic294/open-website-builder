/**
 * SettingsController — composition-based replacement for inheriting from
 * `EditorComponent`. Owns the per-host settings overlay, CSS editor, custom-CSS
 * application, spacing application, responsive-override bookkeeping, and the
 * node-tree mutation helpers that drive `updateSettingsState`.
 *
 * A LitElement that needs editor settings should:
 *   1. Spread `SETTINGS_HOST_PROPERTIES` into its `static properties`.
 *   2. Initialize each property to its default in its constructor.
 *   3. Instantiate `this.settings = new SettingsController(this)`.
 *   4. Forward `connectedCallback`, `disconnectedCallback`, `willUpdate` to
 *      `this.settings.onConnected/onDisconnected/onWillUpdate`.
 *
 * Two consumers:
 *   - `<editor-root>` (the singleton `EditorComponent`) reuses one controller
 *     for plugin-based components via `EditorComponent.openFor(ownerElement)`.
 *   - `OwbLayoutContainerEditor` (the grid editor) instantiates its own
 *     controller per layout element.
 */

import { html, render } from "lit";
import { Ellipsis, ArrowUp, ArrowDown, Trash, X, createElement } from "lucide";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { syntaxTree } from "@codemirror/language";
import { linter, lintGutter } from "@codemirror/lint";
import overlayStyles from "./styles-settings.css?inline";

export const OVERLAY_WIDTH = 340;
export const OVERLAY_HEIGHT = 480;

// Ordered widest-first. Each bucket inherits from all buckets before it.
const RESPONSIVE_BUCKET_ORDER = [
  "tabletHorizontal",
  "mobileHorizontal",
  "tabletVertical",
  "mobileVertical",
];

const REORDERABLE_PARENT_TYPES = new Set(["section", "container", "form"]);

const VIEWPORT_LABELS = {
  tabletHorizontal: "Tablet — Horizontal",
  tabletVertical: "Tablet — Vertical",
  mobileHorizontal: "Mobile — Horizontal",
  mobileVertical: "Mobile — Vertical",
};

const cssSyntaxLinter = linter((view) => {
  const diagnostics = [];
  const cursor = syntaxTree(view.state).cursor();
  const seen = new Set();

  do {
    if (!cursor.type.isError) {
      continue;
    }

    const from = cursor.from;
    const to = Math.max(cursor.to, from + 1);
    const key = `${from}:${to}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    diagnostics.push({
      from,
      to,
      severity: "error",
      message: "Invalid CSS syntax",
    });
  } while (cursor.next());

  return diagnostics;
});

/**
 * Reactive properties every settings-aware host must declare. Spread into
 * `static properties` on the host class.
 */
export const SETTINGS_HOST_PROPERTIES = {
  isSettingsEditorOpen: { type: Boolean },
  settingCustomCss: { type: String },
  customCssError: { type: String },
  activeViewportSize: { type: String },
  activeViewportOrientation: { type: String },
  settingSpacingPaddingTop: { type: String },
  settingSpacingPaddingRight: { type: String },
  settingSpacingPaddingBottom: { type: String },
  settingSpacingPaddingLeft: { type: String },
  settingSpacingMarginTop: { type: String },
  settingSpacingMarginRight: { type: String },
  settingSpacingMarginBottom: { type: String },
  settingSpacingMarginLeft: { type: String },
  settingSpacingBorderRadius: { type: String },
  settingSpacingTextColor: { type: String },
  settingSpacingBackgroundColor: { type: String },
  settingSpacingHidden: { type: Boolean },
};

/**
 * Initialize the spacing/CSS host properties to their defaults. Call from the
 * host's constructor after `super()`.
 */
export function initSettingsHostState(host) {
  host.isSettingsEditorOpen = false;
  host.settingCustomCss = "";
  host.customCssError = "";
  host.settingSpacingPaddingTop = "";
  host.settingSpacingPaddingRight = "";
  host.settingSpacingPaddingBottom = "";
  host.settingSpacingPaddingLeft = "";
  host.settingSpacingMarginTop = "";
  host.settingSpacingMarginRight = "";
  host.settingSpacingMarginBottom = "";
  host.settingSpacingMarginLeft = "";
  host.settingSpacingBorderRadius = "";
  host.settingSpacingTextColor = "";
  host.settingSpacingBackgroundColor = "";
  host.settingSpacingHidden = false;

  const initViewport = window.__owbViewport || {
    size: "desktop",
    orientation: "vertical",
  };
  host.activeViewportSize = initViewport.size;
  host.activeViewportOrientation = initViewport.orientation;
}

/**
 * Module-level mutable singleton tracking which element currently owns the
 * settings overlay. Replaces the old `EditorComponent.activeSettingsOwner`
 * static, but keeps that public API working via getters on EditorComponent.
 */
let activeSettingsOwner = null;

export function getActiveSettingsOwner() {
  return activeSettingsOwner;
}

export function setActiveSettingsOwner(nextOwner) {
  activeSettingsOwner = nextOwner;
  window.dispatchEvent(
    new CustomEvent("owb-active-settings-owner-changed", {
      detail: {
        ownerNodeId: String(activeSettingsOwner?.node?.id || ""),
      },
    }),
  );
}

export class SettingsController {
  /**
   * @param {LitElement} host
   * @param {{ focusRouter?: boolean }} [options]
   *   focusRouter: when true, listens for `owb-focus-node` events and routes
   *   focus + settings-open to this host when its node id matches. The
   *   singleton editor-root does NOT need this (plugin-based components
   *   register their own focus listeners).
   */
  constructor(host, { focusRouter = false } = {}) {
    this.host = host;
    this._focusRouterEnabled = focusRouter;
    this._ownerElement = null;
    this.settingsDefaultState = {};
    this.settingsOverlayContainer = null;
    this.settingsOverlayContent = null;
    this.settingsOverlayTabs = [{ id: "settings", label: "Settings" }];
    this.settingsOverlayActiveTab = "settings";
    this.settingsOverlayPosition = this.getInitialOverlayPosition();
    this.cssEditorView = null;
    this.isSyncingCssEditorUpdate = false;
    this.dragState = null;
    this.onOverlayKeydown = this.onOverlayKeydown.bind(this);
    this.onOverlayPointerMove = this.onOverlayPointerMove.bind(this);
    this.onOverlayPointerUp = this.onOverlayPointerUp.bind(this);
    this.onFocusNodeRequest = this.onFocusNodeRequest.bind(this);
    this._onViewportChange = null;
  }

  // ---------- Lifecycle hooks (called by host) ----------

  onConnected() {
    if (this._focusRouterEnabled) {
      window.addEventListener("owb-focus-node", this.onFocusNodeRequest);
    }
    this._onViewportChange = (event) => {
      this.host.activeViewportSize = event.detail.size;
      this.host.activeViewportOrientation = event.detail.orientation;
      this.syncSettingsStateFromNode(this.settingsDefaultState);
      if (this.host.isSettingsEditorOpen) {
        this.renderSettingsOverlay();
      }
    };
    window.addEventListener("owb-viewport-change", this._onViewportChange);
  }

  onWillUpdate(changedProperties) {
    // Always apply spacing styles before Lit renders so the <style data-spacing>
    // element is placed before Lit's managed range and never wiped by re-renders.
    this.applySpacingToRenderRoot();

    if (changedProperties.has("node")) {
      const cssFromNode = this.getNodeCustomCss();
      if (this.host.settingCustomCss !== cssFromNode) {
        this.host.settingCustomCss = cssFromNode;
      }
      this.validateCustomCss(cssFromNode);
      this.applyCustomCssToRenderRoot(cssFromNode);
      this.syncCssEditorValue(cssFromNode);
    }
  }

  onDisconnected() {
    if (this._focusRouterEnabled) {
      window.removeEventListener("owb-focus-node", this.onFocusNodeRequest);
    }
    if (this._onViewportChange) {
      window.removeEventListener("owb-viewport-change", this._onViewportChange);
      this._onViewportChange = null;
    }
    this.closeSettingsEditor();
    this.destroyCssEditor();

    if (this.settingsOverlayContainer) {
      this.settingsOverlayContainer.remove();
      this.settingsOverlayContainer = null;
    }

    window.removeEventListener("pointermove", this.onOverlayPointerMove);
    window.removeEventListener("pointerup", this.onOverlayPointerUp);
  }

  // ---------- Overlay positioning ----------

  getInitialOverlayPosition() {
    return this.clampOverlayPosition({
      x: window.innerWidth - OVERLAY_WIDTH - 30,
      y: window.innerHeight - OVERLAY_HEIGHT - 40,
    });
  }

  clampOverlayPosition(position) {
    const maxX = Math.max(8, window.innerWidth - OVERLAY_WIDTH - 8);
    const maxY = Math.max(8, window.innerHeight - OVERLAY_HEIGHT - 8);

    return {
      x: Math.min(Math.max(8, position.x), maxX),
      y: Math.min(Math.max(8, position.y), maxY),
    };
  }

  ensureOverlayContainer() {
    if (this.settingsOverlayContainer) {
      return;
    }

    const container = document.createElement("div");
    container.setAttribute("data-settings-overlay-root", "true");
    document.body.appendChild(container);
    this.settingsOverlayContainer = container;
  }

  // ---------- Opening the settings overlay for plugin-based owners ----------

  /**
   * Singleton-flow entry point: bind the overlay to an external owner element
   * (a plugin-based custom element with `.node` and `.pageConfig` properties).
   * Used by `EditorComponent.openFor(...)`.
   */
  openFor(ownerElement, options) {
    // Close any active owner that isn't the new one.
    const prevOwner = getActiveSettingsOwner();
    if (
      prevOwner &&
      prevOwner !== ownerElement &&
      typeof prevOwner.closeSettingsEditor === "function"
    ) {
      prevOwner.closeSettingsEditor();
    }

    this._ownerElement = ownerElement;
    this.host.node = ownerElement.node;
    this.host.pageConfig = ownerElement.pageConfig;

    const cssFromNode = this.getNodeCustomCss();
    if (this.host.settingCustomCss !== cssFromNode) {
      this.host.settingCustomCss = cssFromNode;
    }
    this.validateCustomCss(cssFromNode);
    this.syncCssEditorValue(cssFromNode);

    if (options && typeof options === "object" && "defaultState" in options) {
      const { defaultState, ...editorOptions } = options;
      this.syncSettingsStateFromNode(defaultState || {});
      this.openSettingsEditor(editorOptions);
    } else {
      this.openSettingsEditor(options);
    }
  }

  openSettingsEditor(options = html`<p>No settings available.</p>`) {
    // When the singleton is used via openFor(), the logical owner is _ownerElement.
    // For self-hosted controllers (layout editors), the owner is the host.
    const ownerElement = this._ownerElement || this.host;
    const activeOwner = getActiveSettingsOwner();

    // Don't let a child steal settings from its parent collection when it is the active owner.
    if (activeOwner && activeOwner !== ownerElement) {
      const parentCollection = this.findParentCollection();
      if (parentCollection && parentCollection === activeOwner) {
        return;
      }
      if (typeof activeOwner.closeSettingsEditor === "function") {
        activeOwner.closeSettingsEditor();
      } else {
        // Plugin-based owner without a closeSettingsEditor method: tear down
        // the singleton overlay directly.
        this.destroyCssEditor();
        window.removeEventListener("keydown", this.onOverlayKeydown);
      }
    }

    setActiveSettingsOwner(ownerElement);
    this.ensureOverlayContainer();
    this.host.isSettingsEditorOpen = true;

    const cssTab = { id: "css", label: "Styles" };
    const moreTab = {
      id: "more",
      label: html`${createElement(Ellipsis)} More`,
    };

    const withUtilityTabs = (tabs) => {
      const safeTabs = Array.isArray(tabs) && tabs.length ? tabs : [];
      const nextTabs = [...safeTabs];

      if (!nextTabs.some((tab) => tab?.id === "css")) {
        nextTabs.push(cssTab);
      }

      if (!nextTabs.some((tab) => tab?.id === "more")) {
        nextTabs.push(moreTab);
      }

      return nextTabs;
    };

    if (options && typeof options === "object" && "content" in options) {
      const originalContent = options.content;
      const baseTabs =
        Array.isArray(options.tabs) && options.tabs.length
          ? options.tabs
          : [{ id: "settings", label: "Settings" }];
      this.settingsOverlayTabs = withUtilityTabs(baseTabs);
      this.settingsOverlayContent = (activeTab) => {
        if (activeTab === "css") {
          return this.renderCssSettingsTab();
        }

        if (activeTab === "more") {
          return this.renderMoreSettingsTab();
        }

        if (typeof originalContent === "function") {
          return originalContent(activeTab);
        }

        return originalContent;
      };
      this.settingsOverlayActiveTab =
        options.activeTab ?? this.settingsOverlayTabs[0].id;
    } else {
      const originalContent = options;
      this.settingsOverlayTabs = withUtilityTabs([
        { id: "settings", label: "Settings" },
      ]);
      this.settingsOverlayContent = (activeTab) => {
        if (activeTab === "css") {
          return this.renderCssSettingsTab();
        }

        if (activeTab === "more") {
          return this.renderMoreSettingsTab();
        }

        return originalContent;
      };
      this.settingsOverlayActiveTab = "settings";
    }

    this.validateCustomCss(this.host.settingCustomCss);

    this.renderSettingsOverlay();
    window.addEventListener("keydown", this.onOverlayKeydown);
  }

  closeSettingsEditor() {
    this.host.isSettingsEditorOpen = false;
    this.settingsOverlayContent = null;
    this.dragState = null;

    const ownerElement = this._ownerElement || this.host;
    if (getActiveSettingsOwner() === ownerElement) {
      setActiveSettingsOwner(null);
    }

    this._ownerElement = null;

    this.renderSettingsOverlay();
    window.removeEventListener("keydown", this.onOverlayKeydown);
    window.removeEventListener("pointermove", this.onOverlayPointerMove);
    window.removeEventListener("pointerup", this.onOverlayPointerUp);
    this.destroyCssEditor();
  }

  setActiveSettingsTab(tabId) {
    this.settingsOverlayActiveTab = tabId;
    this.renderSettingsOverlay();
  }

  // ---------- CSS editor (CodeMirror) ----------

  getNodeCustomCss() {
    const value = this.host.node?.settings?.customCss;
    return typeof value === "string" ? value : "";
  }

  ensureCssEditorMounted() {
    const host = this.settingsOverlayContainer?.querySelector(
      "[data-css-code-editor]",
    );

    if (!(host instanceof HTMLElement)) {
      this.destroyCssEditor();
      return;
    }

    if (this.cssEditorView && this.cssEditorView.dom.parentElement === host) {
      return;
    }

    this.destroyCssEditor();

    const state = EditorState.create({
      doc: this.host.settingCustomCss,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        css(),
        cssSyntaxLinter,
        lintGutter(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || this.isSyncingCssEditorUpdate) {
            return;
          }

          const nextCss = update.state.doc.toString();
          this.validateCustomCss(nextCss);
          this.applyCustomCssToRenderRoot(nextCss);
          this.updateSettingsState({
            settingCustomCss: nextCss,
          });
        }),
      ],
    });

    this.cssEditorView = new EditorView({
      state,
      parent: host,
    });
  }

  syncCssEditorValue(nextCss) {
    if (!this.cssEditorView) {
      return;
    }

    const currentCss = this.cssEditorView.state.doc.toString();
    if (currentCss === nextCss) {
      return;
    }

    this.isSyncingCssEditorUpdate = true;
    this.cssEditorView.dispatch({
      changes: {
        from: 0,
        to: this.cssEditorView.state.doc.length,
        insert: nextCss,
      },
    });
    this.isSyncingCssEditorUpdate = false;
  }

  destroyCssEditor() {
    if (!this.cssEditorView) {
      return;
    }

    this.cssEditorView.destroy();
    this.cssEditorView = null;
  }

  // ---------- Custom CSS / spacing application to renderRoot ----------

  applyCustomCssToRenderRoot(cssText) {
    if (this._ownerElement) {
      // Plugin-based owners handle custom CSS via their reactive `settings`
      // property re-render (the runtime LitElement reads it and emits the
      // <style> tag). Nothing to do from the singleton.
      this._ownerElement.applyCustomCssToRenderRoot?.(cssText);
      return;
    }

    const root = this.host.renderRoot;
    if (!(root instanceof ShadowRoot)) {
      return;
    }

    let styleEl = root.querySelector("style[data-custom-css]");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.setAttribute("data-custom-css", "true");
      root.appendChild(styleEl);
    }

    styleEl.textContent = String(cssText || "");
  }

  applySpacingToRenderRoot() {
    if (this._ownerElement) {
      // Plugin-based owner handles spacing declaratively via its settings property.
      return;
    }

    const root = this.host.renderRoot;
    if (!(root instanceof ShadowRoot)) {
      return;
    }

    let styleEl = root.querySelector("style[data-spacing]");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.setAttribute("data-spacing", "true");
      root.appendChild(styleEl);
    }

    const props = [
      ["padding-top", this.host.settingSpacingPaddingTop],
      ["padding-right", this.host.settingSpacingPaddingRight],
      ["padding-bottom", this.host.settingSpacingPaddingBottom],
      ["padding-left", this.host.settingSpacingPaddingLeft],
      ["margin-top", this.host.settingSpacingMarginTop],
      ["margin-right", this.host.settingSpacingMarginRight],
      ["margin-bottom", this.host.settingSpacingMarginBottom],
      ["margin-left", this.host.settingSpacingMarginLeft],
      ["border-radius", this.host.settingSpacingBorderRadius],
    ];
    const parts = props
      .filter(([, v]) => String(v || "").trim())
      .map(([p, v]) => `${p}: ${v}`);

    if (this.host.settingSpacingBackgroundColor) {
      parts.push(
        `background-color: var(${this.host.settingSpacingBackgroundColor})`,
      );
    }
    if (this.host.settingSpacingTextColor) {
      parts.push(`color: var(${this.host.settingSpacingTextColor})`);
    }
    if (this.host.settingSpacingHidden) {
      parts.push("display: none !important");
    }

    styleEl.textContent = parts.length ? `:host { ${parts.join("; ")} }` : "";
  }

  validateCustomCss(cssText) {
    const nextCss = String(cssText || "").trim();
    if (!nextCss) {
      this.host.customCssError = "";
      return;
    }

    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(nextCss);
      this.host.customCssError = "";
    } catch (error) {
      this.host.customCssError =
        error && typeof error.message === "string"
          ? error.message
          : "Invalid CSS";
    }
  }

  // ---------- Settings tab rendering ----------

  renderCssSettingsTab() {
    const orderState = this.getNodeOrderState();

    return html`
      <div class="settings-css-tab">
        <settings-section
          title="Padding"
          ?overridden=${this.hasAnyOverriddenKeys(
            "settingSpacingPaddingTop",
            "settingSpacingPaddingRight",
            "settingSpacingPaddingBottom",
            "settingSpacingPaddingLeft",
          )}
        >
          <editor-padding-input
            .value=${{
              top: this.host.settingSpacingPaddingTop,
              right: this.host.settingSpacingPaddingRight,
              bottom: this.host.settingSpacingPaddingBottom,
              left: this.host.settingSpacingPaddingLeft,
            }}
            @change=${(e) => {
              const v = e.detail.value || {};
              this.updateSettingsState({
                settingSpacingPaddingTop: v.top || "",
                settingSpacingPaddingRight: v.right || "",
                settingSpacingPaddingBottom: v.bottom || "",
                settingSpacingPaddingLeft: v.left || "",
              });
            }}
          ></editor-padding-input>
        </settings-section>
        <settings-section
          title="Margin"
          ?overridden=${this.hasAnyOverriddenKeys(
            "settingSpacingMarginTop",
            "settingSpacingMarginRight",
            "settingSpacingMarginBottom",
            "settingSpacingMarginLeft",
          )}
        >
          <editor-padding-input
            .labels=${{
              top: "Top",
              right: "Right",
              bottom: "Bottom",
              left: "Left",
            }}
            .value=${{
              top: this.host.settingSpacingMarginTop,
              right: this.host.settingSpacingMarginRight,
              bottom: this.host.settingSpacingMarginBottom,
              left: this.host.settingSpacingMarginLeft,
            }}
            @change=${(e) => {
              const v = e.detail.value || {};
              this.updateSettingsState({
                settingSpacingMarginTop: v.top || "",
                settingSpacingMarginRight: v.right || "",
                settingSpacingMarginBottom: v.bottom || "",
                settingSpacingMarginLeft: v.left || "",
              });
            }}
          ></editor-padding-input>
        </settings-section>
        <settings-section
          title="Border radius"
          ?overridden=${this.hasAnyOverriddenKeys("settingSpacingBorderRadius")}
        >
          <editor-text-input
            label="Radius"
            placeholder="e.g. 8px or 50%"
            .value=${this.host.settingSpacingBorderRadius}
            @change=${(e) => {
              this.updateSettingsState({
                settingSpacingBorderRadius: e.detail.value || "",
              });
            }}
          ></editor-text-input>
        </settings-section>
        <settings-section
          title="Background color"
          ?overridden=${this.hasAnyOverriddenKeys(
            "settingSpacingBackgroundColor",
          )}
        >
          <editor-color-picker
            .value=${this.host.settingSpacingBackgroundColor}
            label="Background color"
            @change=${(e) => {
              this.updateSettingsState({
                settingSpacingBackgroundColor: e.detail.value || "",
              });
            }}
          ></editor-color-picker>
        </settings-section>
        <settings-section
          title="Text color"
          ?overridden=${this.hasAnyOverriddenKeys("settingSpacingTextColor")}
        >
          <editor-color-picker
            .value=${this.host.settingSpacingTextColor}
            label="Text color"
            @change=${(e) => {
              this.updateSettingsState({
                settingSpacingTextColor: e.detail.value || "",
              });
            }}
          ></editor-color-picker>
        </settings-section>
        <settings-section
          title="Visibility"
          ?overridden=${this.hasAnyOverriddenKeys("settingSpacingHidden")}
        >
          <label class="settings-toggle-label">
            <input
              type="checkbox"
              .checked=${this.host.settingSpacingHidden}
              @change=${(e) => {
                this.updateSettingsState({
                  settingSpacingHidden: e.target.checked,
                });
              }}
            />
            Hide this component
          </label>
          <p class="settings-css-help">
            Applies <code>display: none</code> to this block. Use responsive
            overrides to hide only on specific screen sizes.
          </p>
        </settings-section>
        <settings-section title="Custom CSS">
          <label class="settings-css-label">CSS</label>
          <div class="settings-css-editor" data-css-code-editor></div>
          <p class="settings-css-help">
            Styles are scoped to this block. Syntax errors appear in the gutter.
          </p>
        </settings-section>
        ${orderState?.isEligible
          ? html`
              <div class="settings-node-order">
                <label class="settings-css-label">Node order</label>
                <div class="settings-node-order-actions">
                  <editor-btn
                    style="light"
                    ?disabled=${!orderState.canMoveBackward}
                    @click=${() => this.moveNodeWithinSection("backward")}
                    >${createElement(ArrowUp)} Backward</editor-btn
                  >
                  <editor-btn
                    style="light"
                    ?disabled=${!orderState.canMoveForward}
                    @click=${() => this.moveNodeWithinSection("forward")}
                    >${createElement(ArrowDown)} Forward</editor-btn
                  >
                </div>
                <p class="settings-css-help">
                  Moves this block within the current section.
                </p>
              </div>
            `
          : null}
      </div>
    `;
  }

  renderMoreSettingsTab() {
    const parentState = this.getParentNodeState();

    return html`
      <div class="settings-more-tab">
        <settings-section title="Node actions">
          <editor-btn
            style="light"
            ?disabled=${!parentState.canFocusParent}
            @click=${() => this.focusOnParentNode()}
            >${createElement(ArrowUp)} Focus parent</editor-btn
          >
          <editor-btn
            style="light text-danger"
            ?disabled=${!this.host.node?.id ||
            !Array.isArray(this.host.pageConfig?.content)}
            @click=${() => this.deleteCurrentNode()}
            >${createElement(Trash)} Delete node</editor-btn
          >
          <p class="settings-css-help">
            Permanently removes this node from the page.
          </p>
        </settings-section>
      </div>
    `;
  }

  // ---------- Node tree navigation / mutation ----------

  getParentNodeState() {
    if (!this.host.node?.id || !Array.isArray(this.host.pageConfig?.content)) {
      return { canFocusParent: false, parentNodeId: "" };
    }

    const found = this.findNodeParentInTree(
      this.host.pageConfig.content,
      this.host.node.id,
    );
    const parentNodeId = String(found?.parentNode?.id || "");

    return {
      canFocusParent: Boolean(parentNodeId),
      parentNodeId,
    };
  }

  focusOnParentNode() {
    const parentState = this.getParentNodeState();
    if (!parentState.canFocusParent) {
      return;
    }

    this.closeSettingsEditor();

    window.dispatchEvent(
      new CustomEvent("owb-focus-node", {
        detail: {
          nodeId: parentState.parentNodeId,
        },
      }),
    );
  }

  onFocusNodeRequest(event) {
    const requestedNodeId = String(event?.detail?.nodeId || "");
    if (
      !requestedNodeId ||
      String(this.host.node?.id || "") !== requestedNodeId
    ) {
      return;
    }

    this.host.scrollIntoView({ block: "center", behavior: "smooth" });

    // Layout editors (section/container/form/collection) expose their own
    // tabbed settings via openSectionSettings(); prefer it over the generic
    // overlay so the user sees the real General/Design tabs.
    if (typeof this.host.openSectionSettings === "function") {
      void this.host.openSectionSettings();
      return;
    }

    const editorBlock = this.host.renderRoot?.querySelector(
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

    this.openSettingsEditor();
  }

  removeNodeByIdFromTree(nodes, targetNodeId) {
    let didRemove = false;

    const nextNodes = nodes
      .filter((currentNode) => {
        if (!currentNode || typeof currentNode !== "object") {
          return true;
        }

        if (currentNode.id === targetNodeId) {
          didRemove = true;
          return false;
        }

        return true;
      })
      .map((currentNode) => {
        if (!currentNode || typeof currentNode !== "object") {
          return currentNode;
        }

        if (!Array.isArray(currentNode.content)) {
          return currentNode;
        }

        const nested = this.removeNodeByIdFromTree(
          currentNode.content,
          targetNodeId,
        );

        if (!nested.didRemove) {
          return currentNode;
        }

        didRemove = true;
        return {
          ...currentNode,
          content: nested.nextNodes,
        };
      });

    return {
      nextNodes,
      didRemove,
    };
  }

  deleteCurrentNode() {
    if (!this.host.node?.id || !Array.isArray(this.host.pageConfig?.content)) {
      return;
    }

    const result = this.removeNodeByIdFromTree(
      this.host.pageConfig.content,
      this.host.node.id,
    );
    if (!result.didRemove) {
      return;
    }

    const nextPageConfig = {
      ...this.host.pageConfig,
      content: result.nextNodes,
    };

    this.host.pageConfig = nextPageConfig;
    this.dispatchPageConfigUpdated(nextPageConfig);
    this.closeSettingsEditor();
  }

  findNodeParentInTree(nodes, targetNodeId, parentNode = null) {
    if (!Array.isArray(nodes) || !targetNodeId) {
      return null;
    }

    for (let index = 0; index < nodes.length; index += 1) {
      const currentNode = nodes[index];
      if (!currentNode || typeof currentNode !== "object") {
        continue;
      }

      if (currentNode.id === targetNodeId) {
        return {
          index,
          parentNode,
          siblings: nodes,
          node: currentNode,
        };
      }

      if (Array.isArray(currentNode.content)) {
        const nested = this.findNodeParentInTree(
          currentNode.content,
          targetNodeId,
          currentNode,
        );
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }

  getNodeOrderState() {
    if (!this.host.node?.id || !Array.isArray(this.host.pageConfig?.content)) {
      return {
        isEligible: false,
        canMoveBackward: false,
        canMoveForward: false,
      };
    }

    const found = this.findNodeParentInTree(
      this.host.pageConfig.content,
      this.host.node.id,
    );
    if (!found) {
      return {
        isEligible: false,
        canMoveBackward: false,
        canMoveForward: false,
      };
    }

    const isEligible = REORDERABLE_PARENT_TYPES.has(
      String(found.parentNode?.type || ""),
    );
    if (!isEligible) {
      return {
        isEligible: false,
        canMoveBackward: false,
        canMoveForward: false,
      };
    }

    return {
      isEligible,
      canMoveBackward: found.index > 0,
      canMoveForward: found.index < found.siblings.length - 1,
    };
  }

  moveNodeWithinSection(direction) {
    if (!this.host.node?.id || !Array.isArray(this.host.pageConfig?.content)) {
      return;
    }

    const found = this.findNodeParentInTree(
      this.host.pageConfig.content,
      this.host.node.id,
    );
    const parentType = String(found?.parentNode?.type || "");
    if (!found || !REORDERABLE_PARENT_TYPES.has(parentType)) {
      return;
    }

    const offset = direction === "forward" ? 1 : -1;
    const targetIndex = found.index + offset;
    if (targetIndex < 0 || targetIndex >= found.siblings.length) {
      return;
    }

    const moveInContentTree = (nodes, parentId) => {
      let didChange = false;

      const nextNodes = nodes.map((currentNode) => {
        if (!currentNode || typeof currentNode !== "object") {
          return currentNode;
        }

        if (currentNode.id === parentId && Array.isArray(currentNode.content)) {
          const reordered = [...currentNode.content];
          const [movedNode] = reordered.splice(found.index, 1);
          reordered.splice(targetIndex, 0, movedNode);
          didChange = true;

          return {
            ...currentNode,
            content: reordered,
          };
        }

        if (Array.isArray(currentNode.content)) {
          const nested = moveInContentTree(currentNode.content, parentId);
          if (nested.didChange) {
            didChange = true;
            return {
              ...currentNode,
              content: nested.nextNodes,
            };
          }
        }

        return currentNode;
      });

      return {
        nextNodes,
        didChange,
      };
    };

    const parentId = found.parentNode?.id;
    if (!parentId) {
      return;
    }

    const update = moveInContentTree(this.host.pageConfig.content, parentId);
    if (!update.didChange) {
      return;
    }

    const nextPageConfig = {
      ...this.host.pageConfig,
      content: update.nextNodes,
    };

    this.host.pageConfig = nextPageConfig;
    this.dispatchPageConfigUpdated(nextPageConfig);
    this.renderSettingsOverlay();
  }

  // ---------- Overlay drag handlers ----------

  onOverlayKeydown(event) {
    if (event.key === "Escape") {
      this.closeSettingsEditor();
    }
  }

  onOverlayPointerDown(event) {
    if (
      event.target.closest(".settings-overlay-close") ||
      event.target.closest(".settings-overlay-tab")
    ) {
      return;
    }

    this.dragState = {
      offsetX: event.clientX - this.settingsOverlayPosition.x,
      offsetY: event.clientY - this.settingsOverlayPosition.y,
    };

    window.addEventListener("pointermove", this.onOverlayPointerMove);
    window.addEventListener("pointerup", this.onOverlayPointerUp);
  }

  onOverlayPointerMove(event) {
    if (!this.dragState) {
      return;
    }

    this.settingsOverlayPosition = this.clampOverlayPosition({
      x: event.clientX - this.dragState.offsetX,
      y: event.clientY - this.dragState.offsetY,
    });
    this.renderSettingsOverlay();
  }

  onOverlayPointerUp() {
    this.dragState = null;
    window.removeEventListener("pointermove", this.onOverlayPointerMove);
    window.removeEventListener("pointerup", this.onOverlayPointerUp);
  }

  // ---------- Responsive overrides ----------

  get activeViewportBucket() {
    const size = this.host.activeViewportSize || "desktop";
    if (size === "desktop") return null;
    const orientation = this.host.activeViewportOrientation || "vertical";
    return `${size}${orientation.charAt(0).toUpperCase()}${orientation.slice(1)}`;
  }

  getOverriddenKeysForCurrentBucket() {
    const bucket = this.activeViewportBucket;
    if (!bucket) return new Set();
    const overrides = this.host.node?.settings?.responsiveOverrides?.[bucket];
    if (!overrides || typeof overrides !== "object") return new Set();
    return new Set(Object.keys(overrides));
  }

  hasAnyOverriddenKeys(...keys) {
    const overriddenKeys = this.getOverriddenKeysForCurrentBucket();
    return keys.some((k) => overriddenKeys.has(k));
  }

  renderOverrideIndicator(settingKey) {
    if (!this.activeViewportBucket) return html``;
    const overriddenKeys = this.getOverriddenKeysForCurrentBucket();
    if (!overriddenKeys.has(settingKey)) return html``;
    return html`<button
      type="button"
      class="setting-override-clear"
      title="Clear override — revert to desktop value"
      @click=${(e) => {
        e.stopPropagation();
        this._clearSingleSettingOverride(settingKey);
      }}
    >
      ×
    </button>`;
  }

  _clearSingleSettingOverride(settingKey) {
    const bucket = this.activeViewportBucket;
    if (!bucket) return;
    const node = this.host.node;
    const currentSettings =
      node && typeof node.settings === "object" && node.settings
        ? node.settings
        : {};
    const currentOverrides = currentSettings.responsiveOverrides || {};
    const currentBucket = { ...(currentOverrides[bucket] || {}) };
    delete currentBucket[settingKey];
    const nextOverrides = { ...currentOverrides };
    if (Object.keys(currentBucket).length > 0) {
      nextOverrides[bucket] = currentBucket;
    } else {
      delete nextOverrides[bucket];
    }
    const { responsiveOverrides: _removed, ...baseSettings } = currentSettings;
    const nextSettings =
      Object.keys(nextOverrides).length > 0
        ? { ...baseSettings, responsiveOverrides: nextOverrides }
        : { ...baseSettings };
    if (Object.keys(nextSettings).length > 0) {
      node.settings = nextSettings;
    } else {
      delete node.settings;
    }
    if (
      this.host.pageConfig &&
      Array.isArray(this.host.pageConfig.content) &&
      node.id
    ) {
      const result = this.updateNodeSettingsInTree(
        this.host.pageConfig.content,
        node.id,
        Object.keys(nextSettings).length > 0 ? nextSettings : {},
      );
      if (result.didChange) {
        const nextPageConfig = {
          ...this.host.pageConfig,
          content: result.nextNodes,
        };
        this.host.pageConfig = nextPageConfig;
        this.dispatchPageConfigUpdated(nextPageConfig);
      }
    }
    this.syncSettingsStateFromNode(this.settingsDefaultState);
    this.renderSettingsOverlay();
  }

  clearSettingOverrides() {
    const bucket = this.activeViewportBucket;
    if (!bucket) return;
    const node = this.host.node;
    const currentSettings =
      node && typeof node.settings === "object" && node.settings
        ? node.settings
        : {};
    const { responsiveOverrides: currentOverrides = {}, ...baseSettings } =
      currentSettings;
    const nextOverrides = { ...currentOverrides };
    delete nextOverrides[bucket];
    const nextSettings =
      Object.keys(nextOverrides).length > 0
        ? { ...baseSettings, responsiveOverrides: nextOverrides }
        : { ...baseSettings };
    if (Object.keys(nextSettings).length > 0) {
      node.settings = nextSettings;
    } else {
      delete node.settings;
    }
    if (
      this.host.pageConfig &&
      Array.isArray(this.host.pageConfig.content) &&
      node.id
    ) {
      const result = this.updateNodeSettingsInTree(
        this.host.pageConfig.content,
        node.id,
        Object.keys(nextSettings).length > 0 ? nextSettings : {},
      );
      if (result.didChange) {
        const nextPageConfig = {
          ...this.host.pageConfig,
          content: result.nextNodes,
        };
        this.host.pageConfig = nextPageConfig;
        this.dispatchPageConfigUpdated(nextPageConfig);
      }
    }
    this.syncSettingsStateFromNode(this.settingsDefaultState);
    this.renderSettingsOverlay();
  }

  // ---------- Page-config plumbing ----------

  dispatchPageConfigUpdated(nextPageConfig) {
    if (this._ownerElement) {
      // Sync the updated settings to the plugin owner for immediate re-render.
      const settings = this.host.node?.settings ?? {};
      this._ownerElement.settings =
        Object.keys(settings).length > 0 ? { ...settings } : {};
      this._ownerElement.pageConfig = nextPageConfig;
      this._ownerElement.dispatchEvent(
        new CustomEvent("page-config-updated", {
          detail: nextPageConfig,
          bubbles: true,
          composed: true,
        }),
      );
      return;
    }

    this.host.dispatchEvent(
      new CustomEvent("page-config-updated", {
        detail: nextPageConfig,
        bubbles: true,
        composed: true,
      }),
    );
  }

  syncSettingsStateFromNode(defaultState = {}) {
    this.settingsDefaultState = {
      customCss: "",
      ...defaultState,
    };

    const nodeSettings =
      this.host.node &&
      typeof this.host.node.settings === "object" &&
      this.host.node.settings
        ? this.host.node.settings
        : {};

    const { responsiveOverrides, ...baseSettings } = nodeSettings;

    const bucket = this.activeViewportBucket;
    const bucketIndex = bucket ? RESPONSIVE_BUCKET_ORDER.indexOf(bucket) : -1;
    const effectiveSettings = { ...baseSettings };
    if (
      bucketIndex >= 0 &&
      responsiveOverrides &&
      typeof responsiveOverrides === "object"
    ) {
      for (let i = 0; i <= bucketIndex; i++) {
        const b = RESPONSIVE_BUCKET_ORDER[i];
        if (
          responsiveOverrides[b] &&
          typeof responsiveOverrides[b] === "object"
        ) {
          Object.assign(effectiveSettings, responsiveOverrides[b]);
        }
      }
    }

    for (const [key, fallbackValue] of Object.entries(
      this.settingsDefaultState,
    )) {
      const stateKey = key === "customCss" ? "settingCustomCss" : key;
      this.host[stateKey] =
        key in effectiveSettings && effectiveSettings[key] !== undefined
          ? effectiveSettings[key]
          : fallbackValue;
    }

    this.validateCustomCss(this.host.settingCustomCss);
    this.applyCustomCssToRenderRoot(this.host.settingCustomCss);

    for (const key of [
      "settingSpacingPaddingTop",
      "settingSpacingPaddingRight",
      "settingSpacingPaddingBottom",
      "settingSpacingPaddingLeft",
      "settingSpacingMarginTop",
      "settingSpacingMarginRight",
      "settingSpacingMarginBottom",
      "settingSpacingMarginLeft",
      "settingSpacingBorderRadius",
      "settingSpacingTextColor",
      "settingSpacingBackgroundColor",
    ]) {
      this.host[key] = String(effectiveSettings[key] || "");
    }
    this.host.settingSpacingHidden = Boolean(
      effectiveSettings.settingSpacingHidden,
    );
    this.applySpacingToRenderRoot();
  }

  getPersistedSettings(nextState) {
    const normalizedState = { ...nextState };

    if ("settingCustomCss" in normalizedState) {
      normalizedState.customCss = normalizedState.settingCustomCss;
      delete normalizedState.settingCustomCss;
    }

    const currentSettings =
      this.host.node &&
      typeof this.host.node.settings === "object" &&
      this.host.node.settings
        ? this.host.node.settings
        : {};

    const defaults =
      this.settingsDefaultState && typeof this.settingsDefaultState === "object"
        ? this.settingsDefaultState
        : {};

    const { responsiveOverrides: currentOverrides = {}, ...baseSettings } =
      currentSettings;

    const bucket = this.activeViewportBucket;

    if (!bucket) {
      const nextBase = { ...baseSettings, ...normalizedState };
      for (const [key, defaultValue] of Object.entries(defaults)) {
        const normalKey = key === "customCss" ? "customCss" : key;
        if (normalKey in nextBase && nextBase[normalKey] === defaultValue) {
          delete nextBase[normalKey];
        }
      }
      for (const key of [
        "settingSpacingPaddingTop",
        "settingSpacingPaddingRight",
        "settingSpacingPaddingBottom",
        "settingSpacingPaddingLeft",
        "settingSpacingMarginTop",
        "settingSpacingMarginRight",
        "settingSpacingMarginBottom",
        "settingSpacingMarginLeft",
        "settingSpacingBorderRadius",
        "settingSpacingTextColor",
        "settingSpacingBackgroundColor",
      ]) {
        if (key in nextBase && !String(nextBase[key] || "").trim()) {
          delete nextBase[key];
        }
      }
      if (
        "settingSpacingHidden" in nextBase &&
        !nextBase.settingSpacingHidden
      ) {
        delete nextBase.settingSpacingHidden;
      }
      const hasOverrides = Object.keys(currentOverrides).some(
        (k) => Object.keys(currentOverrides[k] || {}).length > 0,
      );
      if (hasOverrides) nextBase.responsiveOverrides = currentOverrides;
      return nextBase;
    }

    const currentBucket = { ...(currentOverrides[bucket] || {}) };
    const nextBucket = { ...currentBucket, ...normalizedState };

    const bucketIndex = RESPONSIVE_BUCKET_ORDER.indexOf(bucket);
    const inheritedSettings = { ...baseSettings };
    for (let i = 0; i < bucketIndex; i++) {
      const b = RESPONSIVE_BUCKET_ORDER[i];
      if (currentOverrides[b] && typeof currentOverrides[b] === "object") {
        Object.assign(inheritedSettings, currentOverrides[b]);
      }
    }
    for (const [key, value] of Object.entries(normalizedState)) {
      const inheritedValue =
        key in inheritedSettings
          ? inheritedSettings[key]
          : defaults[key === "customCss" ? "customCss" : key];
      if (value === inheritedValue) {
        delete nextBucket[key];
      }
    }

    const nextOverrides = { ...currentOverrides };
    if (Object.keys(nextBucket).length > 0) {
      nextOverrides[bucket] = nextBucket;
    } else {
      delete nextOverrides[bucket];
    }

    const nextBase = { ...baseSettings };
    for (const [key, defaultValue] of Object.entries(defaults)) {
      const normalKey = key === "customCss" ? "customCss" : key;
      if (normalKey in nextBase && nextBase[normalKey] === defaultValue) {
        delete nextBase[normalKey];
      }
    }

    if (Object.keys(nextOverrides).length > 0) {
      nextBase.responsiveOverrides = nextOverrides;
    }

    return nextBase;
  }

  updateNodeSettingsInTree(nodes, targetNodeId, nextSettings) {
    let didChange = false;

    const nextNodes = nodes.map((currentNode) => {
      if (!currentNode || typeof currentNode !== "object") {
        return currentNode;
      }

      if (currentNode.id === targetNodeId) {
        didChange = true;

        const hasSettings =
          nextSettings && Object.keys(nextSettings).length > 0;
        const nextNode = { ...currentNode };

        if (hasSettings) {
          nextNode.settings = nextSettings;
        } else {
          delete nextNode.settings;
        }

        return { ...nextNode };
      }

      if (Array.isArray(currentNode.content)) {
        const result = this.updateNodeSettingsInTree(
          currentNode.content,
          targetNodeId,
          nextSettings,
        );

        if (result.didChange) {
          didChange = true;
          return {
            ...currentNode,
            content: result.nextNodes,
          };
        }
      }

      return currentNode;
    });

    return { nextNodes, didChange };
  }

  updateSettingsState(nextState) {
    Object.assign(this.host, nextState);
    this.applySpacingToRenderRoot();

    const node = this.host.node;
    if (node && typeof node === "object") {
      const nextPersistedSettings = this.getPersistedSettings(nextState);

      if (this._ownerElement && "settings" in this._ownerElement) {
        this._ownerElement.settings =
          Object.keys(nextPersistedSettings).length > 0
            ? { ...nextPersistedSettings }
            : {};
      }

      if (Object.keys(nextPersistedSettings).length > 0) {
        node.settings = nextPersistedSettings;
      } else {
        delete node.settings;
      }

      if (
        this.host.pageConfig &&
        Array.isArray(this.host.pageConfig.content) &&
        node.id
      ) {
        const result = this.updateNodeSettingsInTree(
          this.host.pageConfig.content,
          node.id,
          nextPersistedSettings,
        );

        if (result.didChange) {
          const nextPageConfig = {
            ...this.host.pageConfig,
            content: result.nextNodes,
          };

          this.host.pageConfig = nextPageConfig;
          this.dispatchPageConfigUpdated(nextPageConfig);
        }
      }
    }

    const isOnlyCssUpdate =
      Object.keys(nextState).length === 1 && "settingCustomCss" in nextState;

    if (this.host.isSettingsEditorOpen && !isOnlyCssUpdate) {
      this.renderSettingsOverlay();
    }
  }

  findParentCollection() {
    const startElement = this._ownerElement || this.host;
    if (startElement.tagName === "OWB-COLLECTION-EDITOR") {
      return null;
    }

    let current = startElement;
    while (current) {
      const root = current.getRootNode?.();
      const host = root instanceof ShadowRoot ? root.host : null;
      if (!host) {
        break;
      }

      if (host.tagName === "OWB-COLLECTION-EDITOR") {
        return host;
      }

      current = host;
    }

    return null;
  }

  // ---------- Overlay rendering ----------

  renderSettingsOverlay() {
    if (!this.settingsOverlayContainer) {
      return;
    }

    if (!this.settingsOverlayContent) {
      render(html``, this.settingsOverlayContainer);
      this.destroyCssEditor();
      return;
    }

    const parentCollection = this.findParentCollection();
    const bucket = this.activeViewportBucket;
    const viewportLabel = bucket ? VIEWPORT_LABELS[bucket] : null;
    const overriddenCount = bucket
      ? this.getOverriddenKeysForCurrentBucket().size
      : 0;

    render(
      html`
        <style>
          ${overlayStyles}
        </style>
        <div class="settings-overlay-root">
          <div
            class="settings-overlay-panel"
            role="dialog"
            style=${`left: ${this.settingsOverlayPosition.x}px; top: ${this.settingsOverlayPosition.y}px;`}
          >
            <div
              class="settings-overlay-header"
              @pointerdown=${(event) => this.onOverlayPointerDown(event)}
            >
              <div class="settings-overlay-tabs">
                ${this.settingsOverlayTabs.map(
                  (tab) => html`
                    <button
                      class="settings-overlay-tab ${tab.id ===
                      this.settingsOverlayActiveTab
                        ? "is-active"
                        : ""}"
                      type="button"
                      @click=${() => this.setActiveSettingsTab(tab.id)}
                    >
                      ${tab.label}
                    </button>
                  `,
                )}
              </div>
              <button
                class="settings-overlay-close"
                type="button"
                aria-label="Close settings editor"
                @click=${() => this.closeSettingsEditor()}
              >
                ${createElement(X)}
              </button>
            </div>
            ${viewportLabel
              ? html`<div class="settings-overlay-viewport-bar">
                  <span class="settings-overlay-viewport-label"
                    >${viewportLabel}</span
                  >
                  ${overriddenCount > 0
                    ? html`<button
                        type="button"
                        class="settings-overlay-viewport-reset"
                        title="Reset all overrides for this viewport"
                        @click=${() => this.clearSettingOverrides()}
                      >
                        Reset ${overriddenCount}
                      </button>`
                    : null}
                </div>`
              : null}
            ${parentCollection
              ? html`
                  <div class="settings-overlay-collection-bar">
                    <button
                      type="button"
                      class="settings-overlay-collection-btn"
                      @click=${() => {
                        void parentCollection.openSectionSettings();
                      }}
                    >
                      ← Edit collection list
                    </button>
                  </div>
                `
              : null}
            <div class="settings-overlay-body">
              ${typeof this.settingsOverlayContent === "function"
                ? this.settingsOverlayContent(this.settingsOverlayActiveTab)
                : this.settingsOverlayContent}
            </div>
          </div>
        </div>
      `,
      this.settingsOverlayContainer,
    );

    if (this.settingsOverlayActiveTab === "css") {
      this.ensureCssEditorMounted();
      this.syncCssEditorValue(this.host.settingCustomCss);
      return;
    }

    this.destroyCssEditor();
  }
}
