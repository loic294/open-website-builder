import { LitElement, html, render, unsafeCSS } from "lit";
import { ArrowDown, ArrowUp, Ellipsis, Trash, X, createElement } from "lucide";
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
import blocksStyles from "./styles-blocks.css?inline";

// Ordered widest-first. Each bucket inherits from all buckets before it.
const RESPONSIVE_BUCKET_ORDER = [
  "tabletHorizontal",
  "mobileHorizontal",
  "tabletVertical",
  "mobileVertical",
];

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

const REORDERABLE_PARENT_TYPES = new Set(["section", "container", "form"]);

export class EditorComponent extends LitElement {
  static overlayWidth = 340;

  static overlayHeight = 480;

  static activeSettingsOwner = null;

  static dispatchActiveSettingsOwnerChanged() {
    window.dispatchEvent(
      new CustomEvent("owb-active-settings-owner-changed", {
        detail: {
          ownerNodeId: String(
            EditorComponent.activeSettingsOwner?.node?.id || "",
          ),
        },
      }),
    );
  }

  static properties = {
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
  };

  static styles = unsafeCSS(blocksStyles);

  constructor() {
    super();
    this.isSettingsEditorOpen = false;
    this.settingsDefaultState = {};
    this.settingsOverlayContainer = null;
    this.settingsOverlayContent = null;
    this.settingsOverlayTabs = [{ id: "settings", label: "Settings" }];
    this.settingsOverlayActiveTab = "settings";
    this.settingsOverlayPosition = this.getInitialOverlayPosition();
    this.settingCustomCss = "";
    this.customCssError = "";
    this.settingSpacingPaddingTop = "";
    this.settingSpacingPaddingRight = "";
    this.settingSpacingPaddingBottom = "";
    this.settingSpacingPaddingLeft = "";
    this.settingSpacingMarginTop = "";
    this.settingSpacingMarginRight = "";
    this.settingSpacingMarginBottom = "";
    this.settingSpacingMarginLeft = "";
    this.cssEditorView = null;
    this.isSyncingCssEditorUpdate = false;
    this.dragState = null;
    this.onOverlayKeydown = this.onOverlayKeydown.bind(this);
    this.onOverlayPointerMove = this.onOverlayPointerMove.bind(this);
    this.onOverlayPointerUp = this.onOverlayPointerUp.bind(this);
    this.onFocusNodeRequest = this.onFocusNodeRequest.bind(this);
    const initViewport = window.__owbViewport || {
      size: "desktop",
      orientation: "vertical",
    };
    this.activeViewportSize = initViewport.size;
    this.activeViewportOrientation = initViewport.orientation;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("owb-focus-node", this.onFocusNodeRequest);
    this._onViewportChange = (event) => {
      this.activeViewportSize = event.detail.size;
      this.activeViewportOrientation = event.detail.orientation;
      this.syncSettingsStateFromNode(this.settingsDefaultState);
      if (this.isSettingsEditorOpen) {
        this.renderSettingsOverlay();
      }
    };
    window.addEventListener("owb-viewport-change", this._onViewportChange);
  }

  willUpdate(changedProperties) {
    if (changedProperties.has("node")) {
      const cssFromNode = this.getNodeCustomCss();
      if (this.settingCustomCss !== cssFromNode) {
        this.settingCustomCss = cssFromNode;
      }
      this.validateCustomCss(cssFromNode);
      this.applyCustomCssToRenderRoot(cssFromNode);
      this.syncCssEditorValue(cssFromNode);
    }
  }

  getInitialOverlayPosition() {
    return this.clampOverlayPosition({
      x: window.innerWidth - EditorComponent.overlayWidth - 30,
      y: window.innerHeight - EditorComponent.overlayHeight - 40,
    });
  }

  clampOverlayPosition(position) {
    const maxX = Math.max(
      8,
      window.innerWidth - EditorComponent.overlayWidth - 8,
    );
    const maxY = Math.max(
      8,
      window.innerHeight - EditorComponent.overlayHeight - 8,
    );

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

  openSettingsEditor(options = html`<p>No settings available.</p>`) {
    const activeOwner = EditorComponent.activeSettingsOwner;

    // Don't let a child steal settings from its parent collection when it is the active owner
    if (activeOwner && activeOwner !== this) {
      const parentCollection = this.findParentCollection();
      if (parentCollection && parentCollection === activeOwner) {
        return;
      }
      activeOwner.closeSettingsEditor();
    }

    EditorComponent.activeSettingsOwner = this;
    EditorComponent.dispatchActiveSettingsOwnerChanged();
    this.ensureOverlayContainer();
    this.isSettingsEditorOpen = true;

    const cssTab = { id: "css", label: "CSS" };
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

    this.validateCustomCss(this.settingCustomCss);

    this.renderSettingsOverlay();
    window.addEventListener("keydown", this.onOverlayKeydown);
  }

  getNodeCustomCss() {
    const css = this.node?.settings?.customCss;
    return typeof css === "string" ? css : "";
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
      doc: this.settingCustomCss,
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

  applyCustomCssToRenderRoot(cssText) {
    if (!(this.renderRoot instanceof ShadowRoot)) {
      return;
    }

    let styleEl = this.renderRoot.querySelector("style[data-custom-css]");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.setAttribute("data-custom-css", "true");
      this.renderRoot.appendChild(styleEl);
    }

    styleEl.textContent = String(cssText || "");
  }

  applySpacingToRenderRoot() {
    if (!(this.renderRoot instanceof ShadowRoot)) {
      return;
    }

    let styleEl = this.renderRoot.querySelector("style[data-spacing]");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.setAttribute("data-spacing", "true");
      this.renderRoot.appendChild(styleEl);
    }

    const props = [
      ["padding-top", this.settingSpacingPaddingTop],
      ["padding-right", this.settingSpacingPaddingRight],
      ["padding-bottom", this.settingSpacingPaddingBottom],
      ["padding-left", this.settingSpacingPaddingLeft],
      ["margin-top", this.settingSpacingMarginTop],
      ["margin-right", this.settingSpacingMarginRight],
      ["margin-bottom", this.settingSpacingMarginBottom],
      ["margin-left", this.settingSpacingMarginLeft],
    ];
    const parts = props
      .filter(([, v]) => String(v || "").trim())
      .map(([p, v]) => `${p}: ${v}`);
    styleEl.textContent = parts.length ? `:host { ${parts.join("; ")} }` : "";
  }

  validateCustomCss(cssText) {
    const nextCss = String(cssText || "").trim();
    if (!nextCss) {
      this.customCssError = "";
      return;
    }

    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(nextCss);
      this.customCssError = "";
    } catch (error) {
      this.customCssError =
        error && typeof error.message === "string"
          ? error.message
          : "Invalid CSS";
    }
  }

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
              top: this.settingSpacingPaddingTop,
              right: this.settingSpacingPaddingRight,
              bottom: this.settingSpacingPaddingBottom,
              left: this.settingSpacingPaddingLeft,
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
              top: this.settingSpacingMarginTop,
              right: this.settingSpacingMarginRight,
              bottom: this.settingSpacingMarginBottom,
              left: this.settingSpacingMarginLeft,
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
            ?disabled=${!this.node?.id ||
            !Array.isArray(this.pageConfig?.content)}
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

  getParentNodeState() {
    if (!this.node?.id || !Array.isArray(this.pageConfig?.content)) {
      return { canFocusParent: false, parentNodeId: "" };
    }

    const found = this.findNodeParentInTree(
      this.pageConfig.content,
      this.node.id,
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
    if (!requestedNodeId || String(this.node?.id || "") !== requestedNodeId) {
      return;
    }

    this.scrollIntoView({ block: "center", behavior: "smooth" });

    const editorBlock = this.renderRoot?.querySelector("[data-editor-block]");
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
    if (!this.node?.id || !Array.isArray(this.pageConfig?.content)) {
      return;
    }

    const result = this.removeNodeByIdFromTree(
      this.pageConfig.content,
      this.node.id,
    );
    if (!result.didRemove) {
      return;
    }

    const nextPageConfig = {
      ...this.pageConfig,
      content: result.nextNodes,
    };

    this.pageConfig = nextPageConfig;
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
    if (!this.node?.id || !Array.isArray(this.pageConfig?.content)) {
      return {
        isEligible: false,
        canMoveBackward: false,
        canMoveForward: false,
      };
    }

    const found = this.findNodeParentInTree(
      this.pageConfig.content,
      this.node.id,
    );
    if (!found) {
      return {
        isEligible: false,
        canMoveBackward: false,
        canMoveForward: false,
      };
    }

    // Reordering from CSS tab is limited to direct children of layout containers.
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
    if (!this.node?.id || !Array.isArray(this.pageConfig?.content)) {
      return;
    }

    const found = this.findNodeParentInTree(
      this.pageConfig.content,
      this.node.id,
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

    const update = moveInContentTree(this.pageConfig.content, parentId);
    if (!update.didChange) {
      return;
    }

    const nextPageConfig = {
      ...this.pageConfig,
      content: update.nextNodes,
    };

    this.pageConfig = nextPageConfig;
    this.dispatchPageConfigUpdated(nextPageConfig);
    this.renderSettingsOverlay();
  }

  closeSettingsEditor() {
    this.isSettingsEditorOpen = false;
    this.settingsOverlayContent = null;
    this.dragState = null;

    if (EditorComponent.activeSettingsOwner === this) {
      EditorComponent.activeSettingsOwner = null;
      EditorComponent.dispatchActiveSettingsOwnerChanged();
    }

    this.renderSettingsOverlay();
    window.removeEventListener("keydown", this.onOverlayKeydown);
    window.removeEventListener("pointermove", this.onOverlayPointerMove);
    window.removeEventListener("pointerup", this.onOverlayPointerUp);
    this.destroyCssEditor();
  }

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

  setActiveSettingsTab(tabId) {
    this.settingsOverlayActiveTab = tabId;
    this.renderSettingsOverlay();
  }

  get activeViewportBucket() {
    const size = this.activeViewportSize || "desktop";
    if (size === "desktop") return null;
    const orientation = this.activeViewportOrientation || "vertical";
    return `${size}${orientation.charAt(0).toUpperCase()}${orientation.slice(1)}`;
  }

  getOverriddenKeysForCurrentBucket() {
    const bucket = this.activeViewportBucket;
    if (!bucket) return new Set();
    const overrides = this.node?.settings?.responsiveOverrides?.[bucket];
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
    const currentSettings =
      this.node && typeof this.node.settings === "object" && this.node.settings
        ? this.node.settings
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
      this.node.settings = nextSettings;
    } else {
      delete this.node.settings;
    }
    if (
      this.pageConfig &&
      Array.isArray(this.pageConfig.content) &&
      this.node.id
    ) {
      const result = this.updateNodeSettingsInTree(
        this.pageConfig.content,
        this.node.id,
        Object.keys(nextSettings).length > 0 ? nextSettings : {},
      );
      if (result.didChange) {
        const nextPageConfig = {
          ...this.pageConfig,
          content: result.nextNodes,
        };
        this.pageConfig = nextPageConfig;
        this.dispatchPageConfigUpdated(nextPageConfig);
      }
    }
    this.syncSettingsStateFromNode(this.settingsDefaultState);
    this.renderSettingsOverlay();
  }

  clearSettingOverrides() {
    const bucket = this.activeViewportBucket;
    if (!bucket) return;
    const currentSettings =
      this.node && typeof this.node.settings === "object" && this.node.settings
        ? this.node.settings
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
      this.node.settings = nextSettings;
    } else {
      delete this.node.settings;
    }
    if (
      this.pageConfig &&
      Array.isArray(this.pageConfig.content) &&
      this.node.id
    ) {
      const result = this.updateNodeSettingsInTree(
        this.pageConfig.content,
        this.node.id,
        Object.keys(nextSettings).length > 0 ? nextSettings : {},
      );
      if (result.didChange) {
        const nextPageConfig = {
          ...this.pageConfig,
          content: result.nextNodes,
        };
        this.pageConfig = nextPageConfig;
        this.dispatchPageConfigUpdated(nextPageConfig);
      }
    }
    this.syncSettingsStateFromNode(this.settingsDefaultState);
    this.renderSettingsOverlay();
  }

  dispatchPageConfigUpdated(nextPageConfig) {
    this.dispatchEvent(
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
      this.node && typeof this.node.settings === "object" && this.node.settings
        ? this.node.settings
        : {};

    // Separate base settings from responsiveOverrides
    const { responsiveOverrides, ...baseSettings } = nodeSettings;

    // Merge in overrides for the current viewport bucket, cascading from parent buckets
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
      this[stateKey] =
        key in effectiveSettings && effectiveSettings[key] !== undefined
          ? effectiveSettings[key]
          : fallbackValue;
    }

    this.validateCustomCss(this.settingCustomCss);
    this.applyCustomCssToRenderRoot(this.settingCustomCss);

    // Sync base-class spacing properties from effective settings
    for (const key of [
      "settingSpacingPaddingTop",
      "settingSpacingPaddingRight",
      "settingSpacingPaddingBottom",
      "settingSpacingPaddingLeft",
      "settingSpacingMarginTop",
      "settingSpacingMarginRight",
      "settingSpacingMarginBottom",
      "settingSpacingMarginLeft",
    ]) {
      this[key] = String(effectiveSettings[key] || "");
    }
    this.applySpacingToRenderRoot();
  }

  getPersistedSettings(nextState) {
    const normalizedState = {
      ...nextState,
    };

    if ("settingCustomCss" in normalizedState) {
      normalizedState.customCss = normalizedState.settingCustomCss;
      delete normalizedState.settingCustomCss;
    }

    const currentSettings =
      this.node && typeof this.node.settings === "object" && this.node.settings
        ? this.node.settings
        : {};

    const defaults =
      this.settingsDefaultState && typeof this.settingsDefaultState === "object"
        ? this.settingsDefaultState
        : {};

    const { responsiveOverrides: currentOverrides = {}, ...baseSettings } =
      currentSettings;

    const bucket = this.activeViewportBucket;

    if (!bucket) {
      // Desktop: write directly to base settings (preserve existing responsiveOverrides)
      const nextBase = { ...baseSettings, ...normalizedState };
      for (const [key, defaultValue] of Object.entries(defaults)) {
        const normalKey = key === "customCss" ? "customCss" : key;
        if (normalKey in nextBase && nextBase[normalKey] === defaultValue) {
          delete nextBase[normalKey];
        }
      }
      // Strip empty spacing values
      for (const key of [
        "settingSpacingPaddingTop",
        "settingSpacingPaddingRight",
        "settingSpacingPaddingBottom",
        "settingSpacingPaddingLeft",
        "settingSpacingMarginTop",
        "settingSpacingMarginRight",
        "settingSpacingMarginBottom",
        "settingSpacingMarginLeft",
      ]) {
        if (key in nextBase && !String(nextBase[key] || "").trim()) {
          delete nextBase[key];
        }
      }
      const hasOverrides = Object.keys(currentOverrides).some(
        (k) => Object.keys(currentOverrides[k] || {}).length > 0,
      );
      if (hasOverrides) nextBase.responsiveOverrides = currentOverrides;
      return nextBase;
    }

    // Non-desktop: write to the current bucket's overrides only
    const currentBucket = { ...(currentOverrides[bucket] || {}) };
    const nextBucket = { ...currentBucket, ...normalizedState };

    // Remove keys from the override that equal the inherited value (cascade from parent buckets)
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

    // Strip default values from base (unchanged from original behavior)
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
        const nextNode = {
          ...currentNode,
        };

        if (hasSettings) {
          nextNode.settings = nextSettings;
        } else {
          delete nextNode.settings;
        }

        return {
          ...nextNode,
        };
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
    Object.assign(this, nextState);
    this.applySpacingToRenderRoot();

    if (this.node && typeof this.node === "object") {
      const nextPersistedSettings = this.getPersistedSettings(nextState);

      if (Object.keys(nextPersistedSettings).length > 0) {
        this.node.settings = nextPersistedSettings;
      } else {
        delete this.node.settings;
      }

      if (
        this.pageConfig &&
        Array.isArray(this.pageConfig.content) &&
        this.node.id
      ) {
        const result = this.updateNodeSettingsInTree(
          this.pageConfig.content,
          this.node.id,
          nextPersistedSettings,
        );

        if (result.didChange) {
          const nextPageConfig = {
            ...this.pageConfig,
            content: result.nextNodes,
          };

          this.pageConfig = nextPageConfig;
          this.dispatchPageConfigUpdated(nextPageConfig);
        }
      }
    }

    const isOnlyCssUpdate =
      Object.keys(nextState).length === 1 && "settingCustomCss" in nextState;

    if (this.isSettingsEditorOpen && !isOnlyCssUpdate) {
      this.renderSettingsOverlay();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("owb-focus-node", this.onFocusNodeRequest);
    window.removeEventListener("owb-viewport-change", this._onViewportChange);
    this.closeSettingsEditor();
    this.destroyCssEditor();

    if (this.settingsOverlayContainer) {
      this.settingsOverlayContainer.remove();
      this.settingsOverlayContainer = null;
    }

    window.removeEventListener("pointermove", this.onOverlayPointerMove);
    window.removeEventListener("pointerup", this.onOverlayPointerUp);
  }

  findParentCollection() {
    if (this.tagName === "SITE-COLLECTION") {
      return null;
    }

    let current = this;
    while (current) {
      const root = current.getRootNode?.();
      const host = root instanceof ShadowRoot ? root.host : null;
      if (!host) {
        break;
      }

      if (host.tagName === "SITE-COLLECTION") {
        return host;
      }

      current = host;
    }

    return null;
  }

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
    const VIEWPORT_LABELS = {
      tabletHorizontal: "Tablet — Horizontal",
      tabletVertical: "Tablet — Vertical",
      mobileHorizontal: "Mobile — Horizontal",
      mobileVertical: "Mobile — Vertical",
    };
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
      this.syncCssEditorValue(this.settingCustomCss);
      return;
    }

    this.destroyCssEditor();
  }
}
