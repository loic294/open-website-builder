import { LitElement, html, nothing, unsafeCSS } from "lit";
import { dataLayer } from "../../../editor/data/data-layer.js";
import styles from "./styles.css?inline";

export const defaultSharedConfig = {
  type: "shared",
  content: [],
};

export class OwbShared extends LitElement {
  static editorPlugin = null;

  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    renderNode: { type: Object },
    componentConfig: { state: true },
    loading: { state: true },
    error: { state: true },
    sharedComponentOptions: { state: true },
    isSettingsOpen: { state: true },
  };

  static styles = [unsafeCSS(styles)];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.renderNode = null;
    this.componentConfig = null;
    this.loading = false;
    this.error = "";
    this.loadedComponentId = "";
    this.sharedComponentOptions = [];
    this.isSettingsOpen = false;
    this._onActiveOwnerChanged = this._onActiveOwnerChanged.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    if (OwbShared.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbShared.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    if (OwbShared.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbShared.editorPlugin.onDisconnected?.(this);
    }
    super.disconnectedCallback();
  }

  _onActiveOwnerChanged(event) {
    const ownerNodeId = String(event?.detail?.ownerNodeId || "");
    this.isSettingsOpen = Boolean(
      ownerNodeId && ownerNodeId === String(this.node?.id || ""),
    );
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbShared.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  loadComponentIfNeeded() {
    const componentId = this.currentSharedComponentId;

    if (!componentId) {
      this.loadedComponentId = "";
      this.componentConfig = null;
      this.loading = false;
      this.error = "Missing shared_component_id";
      return;
    }

    if (componentId === this.loadedComponentId) {
      return;
    }

    this.loadedComponentId = componentId;
    void this.loadComponent(componentId);
  }

  async loadSharedComponentOptions() {
    try {
      const items = await dataLayer.listSharedComponents();
      this.sharedComponentOptions = Array.isArray(items)
        ? items.map((item) => ({
            label: item?.title || item?.id || "Untitled",
            value: item?.id || "",
          }))
        : [];
    } catch (error) {
      console.error(error);
      this.sharedComponentOptions = [];
    }
  }

  get currentSharedComponentId() {
    return String(this.node?.settings?.shared_component_id || "").trim();
  }

  navigateToSharedEditor(componentId) {
    const normalizedComponentId = String(componentId || "").trim();
    if (!normalizedComponentId || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams();
    params.set("type", "shared");
    params.set("componentId", normalizedComponentId);

    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, "", nextUrl);
    window.dispatchEvent(new CustomEvent("editor-route-change"));
  }

  async loadComponent(componentId) {
    this.loading = true;
    this.error = "";

    try {
      const componentConfig = await dataLayer.getComponentConfig(componentId);
      if (this.loadedComponentId !== componentId) {
        return;
      }

      this.componentConfig = componentConfig;
    } catch (error) {
      if (this.loadedComponentId !== componentId) {
        return;
      }

      console.error(error);
      this.componentConfig = null;
      this.error =
        error instanceof Error
          ? error.message
          : `Failed to load shared component: ${componentId}`;
    } finally {
      if (this.loadedComponentId === componentId) {
        this.loading = false;
      }
    }
  }

  onSharedConfigUpdated = async (event) => {
    event.stopPropagation();

    const componentId = String(
      this.node?.settings?.shared_component_id || "",
    ).trim();
    if (!componentId) {
      this.error = "Missing shared_component_id";
      return;
    }

    const nextComponentConfig = event?.detail;
    if (!nextComponentConfig || typeof nextComponentConfig !== "object") {
      return;
    }

    this.componentConfig = nextComponentConfig;

    try {
      await dataLayer.saveComponentConfig(componentId, nextComponentConfig);
      this.error = "";
    } catch (error) {
      console.error(error);
      this.error =
        error instanceof Error
          ? error.message
          : `Failed to save shared component: ${componentId}`;
    }
  };

  render() {
    const isEditorMode = OwbShared.editorPlugin !== null;
    const sharedContent = (() => {
      if (this.loading) {
        return html`
          <div class="shared-placeholder">Loading shared content...</div>
        `;
      }

      if (this.error) {
        return html`
          <div class="shared-placeholder shared-error">${this.error}</div>
        `;
      }

      const content = Array.isArray(this.componentConfig?.content)
        ? this.componentConfig.content
        : [];

      if (content.length === 0) {
        return html`
          <div class="shared-placeholder">No shared content found.</div>
        `;
      }

      const renderNode = this.renderNode;
      if (typeof renderNode !== "function") {
        return html`<div class="shared-placeholder">
          Unable to render shared content.
        </div>`;
      }

      return html`
        ${content.map((child) =>
          renderNode(
            child,
            this.componentConfig,
            this.onSharedConfigUpdated,
            renderNode,
          ),
        )}
      `;
    })();

    return html`
      <div
        data-editor-block=${isEditorMode ? "" : nothing}
        class="shared-block ${isEditorMode && this.isSettingsOpen
          ? "is-settings-open"
          : ""}"
        @pointerdown=${isEditorMode
          ? () => OwbShared.editorPlugin?.onPointerDown?.(this)
          : nothing}
      >
        ${sharedContent}
      </div>
    `;
  }
}

if (!customElements.get("owb-shared")) {
  customElements.define("owb-shared", OwbShared);
}
