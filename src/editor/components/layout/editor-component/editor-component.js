import { LitElement, html, render } from "lit";
import { X, createElement } from "lucide/dist/cjs/lucide";
import overlayStyles from "./styles.css?inline";

export class EditorComponent extends LitElement {
  static overlayWidth = 340;

  static overlayHeight = 480;

  static properties = {
    isSettingsEditorOpen: { type: Boolean },
  };

  constructor() {
    super();
    this.isSettingsEditorOpen = false;
    this.settingsOverlayContainer = null;
    this.settingsOverlayContent = null;
    this.settingsOverlayTabs = [{ id: "settings", label: "Settings" }];
    this.settingsOverlayActiveTab = "settings";
    this.settingsOverlayPosition = this.getInitialOverlayPosition();
    this.dragState = null;
    this.onOverlayKeydown = this.onOverlayKeydown.bind(this);
    this.onOverlayPointerMove = this.onOverlayPointerMove.bind(this);
    this.onOverlayPointerUp = this.onOverlayPointerUp.bind(this);
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
    this.ensureOverlayContainer();
    this.isSettingsEditorOpen = true;

    if (options && typeof options === "object" && "content" in options) {
      this.settingsOverlayContent = options.content;
      this.settingsOverlayTabs =
        Array.isArray(options.tabs) && options.tabs.length
          ? options.tabs
          : [{ id: "settings", label: "Settings" }];
      this.settingsOverlayActiveTab =
        options.activeTab ?? this.settingsOverlayTabs[0].id;
    } else {
      this.settingsOverlayContent = options;
      this.settingsOverlayTabs = [{ id: "settings", label: "Settings" }];
      this.settingsOverlayActiveTab = "settings";
    }

    this.renderSettingsOverlay();
    window.addEventListener("keydown", this.onOverlayKeydown);
  }

  closeSettingsEditor() {
    this.isSettingsEditorOpen = false;
    this.settingsOverlayContent = null;
    this.dragState = null;
    this.renderSettingsOverlay();
    window.removeEventListener("keydown", this.onOverlayKeydown);
    window.removeEventListener("pointermove", this.onOverlayPointerMove);
    window.removeEventListener("pointerup", this.onOverlayPointerUp);
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
    const nodeSettings =
      this.node && typeof this.node.settings === "object" && this.node.settings
        ? this.node.settings
        : {};

    for (const [key, fallbackValue] of Object.entries(defaultState)) {
      this[key] =
        key in nodeSettings && nodeSettings[key] !== undefined
          ? nodeSettings[key]
          : fallbackValue;
    }
  }

  updateNodeSettingsInTree(nodes, targetNodeId, nextSettings) {
    let didChange = false;

    const nextNodes = nodes.map((currentNode) => {
      if (!currentNode || typeof currentNode !== "object") {
        return currentNode;
      }

      if (currentNode.id === targetNodeId) {
        didChange = true;
        return {
          ...currentNode,
          settings: {
            ...(currentNode.settings && typeof currentNode.settings === "object"
              ? currentNode.settings
              : {}),
            ...nextSettings,
          },
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
      if (!this.node.settings || typeof this.node.settings !== "object") {
        this.node.settings = {};
      }

      Object.assign(this.node.settings, nextState);

      if (
        this.pageConfig &&
        Array.isArray(this.pageConfig.content) &&
        this.node.id
      ) {
        const result = this.updateNodeSettingsInTree(
          this.pageConfig.content,
          this.node.id,
          nextState,
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

    if (this.isSettingsEditorOpen) {
      this.renderSettingsOverlay();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.closeSettingsEditor();

    if (this.settingsOverlayContainer) {
      this.settingsOverlayContainer.remove();
      this.settingsOverlayContainer = null;
    }

    window.removeEventListener("pointermove", this.onOverlayPointerMove);
    window.removeEventListener("pointerup", this.onOverlayPointerUp);
  }

  renderSettingsOverlay() {
    if (!this.settingsOverlayContainer) {
      return;
    }

    if (!this.settingsOverlayContent) {
      render(html``, this.settingsOverlayContainer);
      return;
    }

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
  }
}
