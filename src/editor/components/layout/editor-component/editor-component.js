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
    this.cssEditorView = null;
    this.isSyncingCssEditorUpdate = false;
    this.dragState = null;
    this.onOverlayKeydown = this.onOverlayKeydown.bind(this);
    this.onOverlayPointerMove = this.onOverlayPointerMove.bind(this);
    this.onOverlayPointerUp = this.onOverlayPointerUp.bind(this);
    this.onFocusNodeRequest = this.onFocusNodeRequest.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("owb-focus-node", this.onFocusNodeRequest);
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
        <label class="settings-css-label">CSS</label>
        <div class="settings-css-editor" data-css-code-editor></div>
        <p class="settings-css-help">
          Styles are scoped to this block. Syntax errors appear in the gutter.
        </p>
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
      editorBlock.click();
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

    for (const [key, fallbackValue] of Object.entries(
      this.settingsDefaultState,
    )) {
      const stateKey = key === "customCss" ? "settingCustomCss" : key;
      this[stateKey] =
        key in nodeSettings && nodeSettings[key] !== undefined
          ? nodeSettings[key]
          : fallbackValue;
    }

    this.validateCustomCss(this.settingCustomCss);
    this.applyCustomCssToRenderRoot(this.settingCustomCss);
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

    const nextPersistedSettings = {
      ...currentSettings,
      ...normalizedState,
    };

    const defaults =
      this.settingsDefaultState && typeof this.settingsDefaultState === "object"
        ? this.settingsDefaultState
        : {};

    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (
        key in nextPersistedSettings &&
        nextPersistedSettings[key] === defaultValue
      ) {
        delete nextPersistedSettings[key];
      }
    }

    return nextPersistedSettings;
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
