import { LitElement, html, unsafeCSS } from "lit";
import { dataLayer } from "../../../editor/data/data-layer.js";
import styles from "./styles.css?inline";

export const defaultSharedConfig = {
  type: "shared",
  content: [],
};

class SharedComponent extends LitElement {
  static properties = {
    node: { type: Object },
    renderNode: { type: Object },
    componentConfig: { state: true },
    loading: { state: true },
    error: { state: true },
  };

  static styles = unsafeCSS(styles);

  constructor() {
    super();
    this.node = null;
    this.renderNode = null;
    this.componentConfig = null;
    this.loading = false;
    this.error = "";
    this.loadedComponentId = "";
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadComponentIfNeeded();
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.loadComponentIfNeeded();
    }
  }

  loadComponentIfNeeded() {
    const componentId = String(
      this.node?.settings?.shared_component_id || "",
    ).trim();

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
    if (this.loading) {
      return html`<div class="shared-placeholder">
        Loading shared content...
      </div>`;
    }

    if (this.error) {
      return html`<div class="shared-placeholder shared-error">
        ${this.error}
      </div>`;
    }

    const content = Array.isArray(this.componentConfig?.content)
      ? this.componentConfig.content
      : [];

    if (content.length === 0) {
      return html`<div class="shared-placeholder">
        No shared content found.
      </div>`;
    }

    const renderNode = this.renderNode;
    if (typeof renderNode !== "function") {
      return html`<div class="shared-placeholder">
        Unable to render shared content.
      </div>`;
    }

    return html`${content.map((child) =>
      renderNode(
        child,
        this.componentConfig,
        this.onSharedConfigUpdated,
        renderNode,
      ),
    )}`;
  }
}

export const editorRenderShared = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-shared
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .renderNode=${renderNode}
  ></site-shared>`;
};

customElements.define("site-shared", SharedComponent);
