import { LitElement, html, unsafeCSS } from "lit";
import { dataLayer } from "../../../editor/data/data-layer.js";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import styles from "./styles.css?inline";

export const defaultSharedConfig = {
  type: "shared",
  content: [],
};

class SharedComponent extends EditorComponent {
  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    renderNode: { type: Object },
    componentConfig: { state: true },
    loading: { state: true },
    error: { state: true },
    sharedComponentOptions: { state: true },
  };

  static styles = unsafeCSS(styles);

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
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadComponentIfNeeded();
    void this.loadSharedComponentOptions();
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
    this.closeSettingsEditor();
  }

  openSharedSettings() {
    const currentId = this.currentSharedComponentId;
    const options = this.sharedComponentOptions;
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

    this.openSettingsEditor({
      tabs: [{ id: "general", label: "General" }],
      content: () => html`
        <settings-section
          title="Shared component"
          ?overridden=${this.hasAnyOverriddenKeys("shared_component_id")}
        >
          <editor-select
            label="Component"
            .value=${currentId}
            .options=${selectOptions}
            @change=${(event) => {
              this.updateSettingsState({
                shared_component_id: event.detail.value,
              });
              this.loadComponentIfNeeded();
            }}
          ></editor-select>
          <editor-btn
            class="edit-shared-component-button"
            style="light"
            @click=${() => this.navigateToSharedEditor(currentId)}
            ?disabled=${!currentId}
          >
            Edit Shared Component
          </editor-btn>
        </settings-section>
      `,
    });
  }

  openSharedSettingsIfNeeded() {
    if (this.isSettingsEditorOpen) {
      return;
    }

    this.openSharedSettings();
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
        data-editor-block
        class="shared-block ${this.isSettingsEditorOpen
          ? "is-settings-open"
          : ""}"
        @pointerdown=${() => this.openSharedSettingsIfNeeded()}
      >
        ${sharedContent}
      </div>
    `;
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
    .pageConfig=${pageConfig}
    .renderNode=${renderNode}
    @page-config-updated=${onPageConfigUpdated}
  ></site-shared>`;
};

customElements.define("site-shared", SharedComponent);
