import { LitElement, html, unsafeCSS } from "lit";
import {
  Blocks,
  ChevronDown,
  Database,
  Files,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Proportions,
  Upload,
  createElement,
} from "lucide";
import { dataLayer } from "../../../data/data-layer.js";
import styles from "./styles.css?inline";

const MENU_COLLAPSED_STORAGE_KEY = "editor-menu-collapsed";
const MENU_MODE_STORAGE_KEY = "editor-menu-mode";

function getNodeLabel(node) {
  const nodeType = String(node?.type || "component");
  const titleValue = typeof node?.title === "string" ? node.title.trim() : "";
  const textContentValue =
    typeof node?.content === "string" ? node.content.trim() : "";

  if (textContentValue && nodeType === "text") {
    const stripped = textContentValue.replace(/<[^>]+>/g, "").trim();
    if (stripped) {
      return stripped.slice(0, 48);
    }
  }

  if (titleValue) {
    return titleValue.slice(0, 48);
  }

  if (textContentValue) {
    return textContentValue.slice(0, 48);
  }

  return nodeType;
}

function cloneNodes(nodes) {
  return JSON.parse(JSON.stringify(Array.isArray(nodes) ? nodes : []));
}

function findNodeById(nodes, nodeId) {
  const list = Array.isArray(nodes) ? nodes : [];
  for (const node of list) {
    if (!node || typeof node !== "object") {
      continue;
    }
    if (String(node.id || "") === nodeId) {
      return node;
    }
    const nested = findNodeById(node.content, nodeId);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function collectDescendantIds(node, ids = new Set()) {
  if (!node || typeof node !== "object") {
    return ids;
  }

  const id = String(node.id || "").trim();
  if (id) {
    ids.add(id);
  }

  const children = Array.isArray(node.content) ? node.content : [];
  for (const child of children) {
    collectDescendantIds(child, ids);
  }

  return ids;
}

function removeNodeById(nodes, nodeId) {
  const list = Array.isArray(nodes) ? nodes : [];
  let removed = null;

  const nextNodes = list
    .map((node) => {
      if (!node || typeof node !== "object") {
        return node;
      }

      if (String(node.id || "") === nodeId) {
        removed = node;
        return null;
      }

      if (!Array.isArray(node.content)) {
        return node;
      }

      const nested = removeNodeById(node.content, nodeId);
      if (!nested.removed) {
        return node;
      }

      removed = nested.removed;
      return {
        ...node,
        content: nested.nextNodes,
      };
    })
    .filter(Boolean);

  return {
    nextNodes,
    removed,
  };
}

function insertNodeAt(nodes, parentId, index, nodeToInsert) {
  const list = Array.isArray(nodes) ? [...nodes] : [];

  if (!parentId) {
    const clamped = Math.max(0, Math.min(index, list.length));
    list.splice(clamped, 0, nodeToInsert);
    return {
      didInsert: true,
      nextNodes: list,
    };
  }

  let didInsert = false;

  const nextNodes = list.map((node) => {
    if (!node || typeof node !== "object") {
      return node;
    }

    if (String(node.id || "") === parentId) {
      const content = Array.isArray(node.content) ? [...node.content] : [];
      const clamped = Math.max(0, Math.min(index, content.length));
      content.splice(clamped, 0, nodeToInsert);
      didInsert = true;
      return {
        ...node,
        content,
      };
    }

    if (!Array.isArray(node.content)) {
      return node;
    }

    const nested = insertNodeAt(node.content, parentId, index, nodeToInsert);
    if (!nested.didInsert) {
      return node;
    }

    didInsert = true;
    return {
      ...node,
      content: nested.nextNodes,
    };
  });

  return {
    didInsert,
    nextNodes,
  };
}

class EditorMenu extends LitElement {
  static properties = {
    collapsed: { type: Boolean, reflect: true },
    sections: { state: true },
    groupItems: { state: true },
    collectionSections: { state: true },
    menuMode: { state: true },
    layersConfig: { state: true },
    layerSections: { state: true },
    activeLayerNodeId: { state: true },
    dropTargetKey: { state: true },
    isDragging: { state: true },
  };

  static styles = unsafeCSS(styles);

  constructor() {
    super();
    this.collapsed = this.getStoredCollapsedState();
    this.sections = {
      pages: true,
      collections: true,
      shared: true,
    };
    this.groupItems = {
      pages: [],
      collections: [],
      shared: [],
    };
    this.collectionSections = {};
    this.menuMode = this.getStoredMenuMode();
    this.layersConfig = null;
    this.layerSections = {};
    this.activeLayerNodeId = "";
    this.draggedLayerNodeId = "";
    this.dropTargetKey = "";
    this.isDragging = false;
    this.didLoadData = false;
    this.currentRoute = this.getRouteSelection();
  }

  getStoredMenuMode() {
    if (typeof window === "undefined") {
      return "site-content";
    }

    const value = window.localStorage.getItem(MENU_MODE_STORAGE_KEY);
    return value === "layers" ? "layers" : "site-content";
  }

  persistMenuMode() {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(MENU_MODE_STORAGE_KEY, this.menuMode);
  }

  setMenuMode(nextMode) {
    this.menuMode = nextMode === "layers" ? "layers" : "site-content";
    this.persistMenuMode();
  }

  async reloadGroupItems() {
    const [pagesResult, collectionsResult, sharedResult] =
      await Promise.allSettled([
        dataLayer.listPages(),
        dataLayer.getGroupedCollectionsContent(),
        dataLayer.listSharedComponents(),
      ]);

    if (pagesResult.status === "rejected") {
      console.error(pagesResult.reason);
    }

    if (collectionsResult.status === "rejected") {
      console.error(collectionsResult.reason);
    }

    if (sharedResult.status === "rejected") {
      console.error(sharedResult.reason);
    }

    const pages = pagesResult.status === "fulfilled" ? pagesResult.value : [];
    const collectionsContent =
      collectionsResult.status === "fulfilled" ? collectionsResult.value : [];
    const sharedComponents =
      sharedResult.status === "fulfilled" ? sharedResult.value : [];

    this.groupItems = {
      pages: pages.map((page) => ({
        kind: "page",
        id: page?.id || "",
        title: page?.title || page?.id || "Untitled",
        url: page?.url || "",
      })),
      collections: collectionsContent.map((collection) => {
        const collectionId = collection?.collectionId || "";
        const collectionTitle =
          collection?.title || collectionId || "Collection";
        const items = Array.isArray(collection?.items) ? collection.items : [];

        return {
          collectionId,
          collectionTitle,
          config: {
            kind: "collection-config",
            collectionId,
            collectionTitle,
            title: collection?.configItem?.title || "_config.json",
          },
          items: items.map((item) => ({
            kind: "collection-item",
            collectionId,
            collectionTitle,
            itemId: item?.id || "",
            title: item?.title || item?.id || "Untitled",
          })),
        };
      }),
      shared: sharedComponents.map((component) => ({
        kind: "shared",
        id: component?.id || "",
        title: component?.title || component?.id || "Untitled",
      })),
    };

    const knownCollectionIds = new Set(
      this.groupItems.collections
        .map((item) => String(item?.collectionId || "").trim())
        .filter(Boolean),
    );

    const nextCollectionSections = {};
    for (const collectionId of knownCollectionIds) {
      nextCollectionSections[collectionId] =
        this.collectionSections?.[collectionId] ?? true;
    }

    this.collectionSections = nextCollectionSections;
  }

  async connectedCallback() {
    super.connectedCallback();

    this.onRouteChanged = async () => {
      this.currentRoute = this.getRouteSelection();
      await this.reloadLayersConfig();
    };
    this.onDataChanged = async () => {
      await this.reloadGroupItems();
      await this.reloadLayersConfig();
    };
    this.onSettingsOwnerChanged = (event) => {
      this.activeLayerNodeId = String(event?.detail?.ownerNodeId || "");
    };
    window.addEventListener("popstate", this.onRouteChanged);
    window.addEventListener("editor-route-change", this.onRouteChanged);
    window.addEventListener("editor-data-changed", this.onDataChanged);
    window.addEventListener(
      "owb-active-settings-owner-changed",
      this.onSettingsOwnerChanged,
    );

    if (this.didLoadData) {
      return;
    }

    this.didLoadData = true;

    await this.reloadGroupItems();
    await this.reloadLayersConfig();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this.onRouteChanged);
    window.removeEventListener("editor-route-change", this.onRouteChanged);
    window.removeEventListener("editor-data-changed", this.onDataChanged);
    window.removeEventListener(
      "owb-active-settings-owner-changed",
      this.onSettingsOwnerChanged,
    );
  }

  async reloadLayersConfig() {
    const selection = this.getRouteSelection();

    try {
      if (selection.type === "collection-config") {
        this.layersConfig = await dataLayer.getCollectionConfig(
          selection.collectionId,
        );
      } else if (selection.type === "collection") {
        this.layersConfig = await dataLayer.getCollectionItemContent(
          selection.collectionId,
          selection.itemId,
        );
      } else if (selection.type === "shared") {
        this.layersConfig = await dataLayer.getComponentConfig(
          selection.componentId,
        );
      } else {
        this.layersConfig = await dataLayer.getPageConfig(selection.pageId);
      }
    } catch (error) {
      console.error(error);
      this.layersConfig = null;
    }

    const ids = new Set();
    const walk = (nodes) => {
      for (const node of Array.isArray(nodes) ? nodes : []) {
        const id = String(node?.id || "").trim();
        if (id) {
          ids.add(id);
        }
        walk(node?.content);
      }
    };
    walk(this.layersConfig?.content);

    const nextLayerSections = {};
    for (const id of ids) {
      nextLayerSections[id] = this.layerSections?.[id] ?? true;
    }
    this.layerSections = nextLayerSections;
  }

  toggleLayerSection(nodeId) {
    const id = String(nodeId || "").trim();
    if (!id) {
      return;
    }

    this.layerSections = {
      ...(this.layerSections || {}),
      [id]: !Boolean(this.layerSections?.[id]),
    };
  }

  focusLayerNode(nodeId) {
    const id = String(nodeId || "").trim();
    if (!id) {
      return;
    }

    this.activeLayerNodeId = id;
    window.dispatchEvent(
      new CustomEvent("owb-focus-node", {
        detail: { nodeId: id },
      }),
    );
  }

  onLayerPointerDown(event, nodeId) {
    const id = String(nodeId || "").trim();
    if (!id) return;

    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);

    this.draggedLayerNodeId = id;
    this.isDragging = true;
    this.dropTargetKey = "";
    this._dragStartY = event.clientY;
    this._dragMoved = false;

    const onMove = (moveEvent) => {
      if (!this.isDragging) return;
      const dy = Math.abs(moveEvent.clientY - this._dragStartY);
      if (dy > 4) this._dragMoved = true;
      if (!this._dragMoved) return;

      // Find closest drop zone by clientY
      const zones = Array.from(
        this.renderRoot?.querySelectorAll(".layer-drop-zone") ?? [],
      );
      let bestKey = "";
      let bestDist = Infinity;
      for (const zone of zones) {
        const rect = zone.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const dist = Math.abs(moveEvent.clientY - centerY);
        if (dist < bestDist) {
          bestDist = dist;
          bestKey = zone.dataset.zoneKey || "";
        }
      }
      if (this.dropTargetKey !== bestKey) {
        this.dropTargetKey = bestKey;
      }
    };

    const onUp = async () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);

      const sourceId = this.draggedLayerNodeId;
      const targetKey = this.dropTargetKey;
      this.draggedLayerNodeId = "";
      this.isDragging = false;
      this.dropTargetKey = "";

      if (!sourceId || !targetKey || !this._dragMoved) return;

      const colonIdx = targetKey.lastIndexOf(":");
      const parentId = targetKey.slice(0, colonIdx);
      const index = parseInt(targetKey.slice(colonIdx + 1), 10);
      if (!Number.isFinite(index)) return;

      await this.moveLayerNode(sourceId, parentId, index);
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  async saveLayersContent(nextContent) {
    const selection = this.getRouteSelection();
    const nextConfig = {
      ...(this.layersConfig && typeof this.layersConfig === "object"
        ? this.layersConfig
        : {}),
      content: nextContent,
    };

    if (selection.type === "collection-config") {
      await dataLayer.saveCollectionConfig(selection.collectionId, nextConfig);
    } else if (selection.type === "collection") {
      await dataLayer.updateCollectionItem(
        selection.collectionId,
        selection.itemId,
        nextConfig,
      );
    } else if (selection.type === "shared") {
      const componentId = String(
        this.layersConfig?.id || selection.componentId || "",
      ).trim();
      await dataLayer.saveComponentConfig(componentId, nextConfig);
    } else {
      await dataLayer.savePageConfig(selection.pageId || "index", nextConfig);
    }

    this.layersConfig = nextConfig;
    window.dispatchEvent(new CustomEvent("editor-route-change"));
  }

  async moveLayerNode(sourceNodeId, targetParentId, targetIndex) {
    const sourceId = String(sourceNodeId || "").trim();
    if (!sourceId) {
      return;
    }

    const sourceTree = cloneNodes(this.layersConfig?.content);
    const sourceNode = findNodeById(sourceTree, sourceId);
    if (!sourceNode) {
      return;
    }

    const blockedTargets = collectDescendantIds(sourceNode);
    const normalizedTargetParentId = String(targetParentId || "").trim();
    if (
      normalizedTargetParentId &&
      blockedTargets.has(normalizedTargetParentId)
    ) {
      return;
    }

    const removed = removeNodeById(sourceTree, sourceId);
    if (!removed.removed) {
      return;
    }

    const inserted = insertNodeAt(
      removed.nextNodes,
      normalizedTargetParentId || "",
      Number.isFinite(targetIndex) ? targetIndex : 0,
      removed.removed,
    );
    if (!inserted.didInsert) {
      return;
    }

    await this.saveLayersContent(inserted.nextNodes);
    this.focusLayerNode(sourceId);
  }

  getNodeTypeLabel(type) {
    return String(type || "component").replace(/-/g, " ");
  }

  renderLayerNode(node, parentId, index, depth = 0) {
    if (!node || typeof node !== "object") {
      return html``;
    }

    const nodeId = String(node.id || "").trim();
    const hasChildren = Array.isArray(node.content) && node.content.length > 0;
    const isExpanded = this.layerSections?.[nodeId] ?? true;
    const isActive = nodeId && nodeId === this.activeLayerNodeId;

    const beforeKey = `${String(parentId || "")}:${index}`;
    const afterKey = `${nodeId}:${Array.isArray(node.content) ? node.content.length : 0}`;
    const isDraggedNode = nodeId && nodeId === this.draggedLayerNodeId;

    return html`
      <div class="layer-entry" style=${`--layer-depth:${depth};`}>
        <div
          class="layer-drop-zone ${this.dropTargetKey === beforeKey
            ? "is-active"
            : ""}"
          data-zone-key=${beforeKey}
        ></div>
        <div
          class="layer-row ${isActive ? "is-active" : ""} ${isDraggedNode
            ? "is-dragging"
            : ""}"
        >
          <span
            class="layer-drag-handle"
            aria-hidden="true"
            @pointerdown=${(event) => this.onLayerPointerDown(event, nodeId)}
          >
            ${createElement(GripVertical)}
          </span>
          ${hasChildren
            ? html`
                <button
                  type="button"
                  class="layer-toggle"
                  @click=${() => this.toggleLayerSection(nodeId)}
                >
                  <span
                    class="collection-folder-chevron ${isExpanded
                      ? ""
                      : "is-collapsed"}"
                  >
                    ${createElement(ChevronDown)}
                  </span>
                </button>
              `
            : html`<span class="layer-toggle layer-toggle-spacer"></span>`}

          <button
            type="button"
            class="layer-select ${isActive ? "is-active" : ""}"
            @click=${() => this.focusLayerNode(nodeId)}
          >
            <span class="layer-title">${getNodeLabel(node)}</span>
            <span class="layer-meta">
              ${this.getNodeTypeLabel(node.type)}${nodeId ? ` / ${nodeId}` : ""}
            </span>
          </button>
        </div>

        ${hasChildren && isExpanded
          ? html`
              <div class="layer-children">
                ${(node.content || []).map((child, childIndex) =>
                  this.renderLayerNode(child, nodeId, childIndex, depth + 1),
                )}
                <div
                  class="layer-drop-zone ${this.dropTargetKey === afterKey
                    ? "is-active"
                    : ""}"
                  data-zone-key=${afterKey}
                ></div>
              </div>
            `
          : html``}
      </div>
    `;
  }

  renderLayersTree() {
    const content = Array.isArray(this.layersConfig?.content)
      ? this.layersConfig.content
      : [];

    if (!content.length) {
      return html`<div class="group-item"><span>No components yet</span></div>`;
    }

    const trailingKey = `:${content.length}`;

    return html`
      <div class="layers-tree ${this.isDragging ? "is-dragging" : ""}">
        ${content.map((node, index) =>
          this.renderLayerNode(node, "", index, 0),
        )}
        <div
          class="layer-drop-zone ${this.dropTargetKey === trailingKey
            ? "is-active"
            : ""}"
          data-zone-key=${trailingKey}
        ></div>
      </div>
    `;
  }

  toSafeId(value, fallbackPrefix) {
    const safe = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return safe || `${fallbackPrefix}-${Date.now()}`;
  }

  async createPageFromMenu() {
    const timestamp = Date.now();
    const title = `New Page ${timestamp}`;
    const pageId = this.toSafeId(`new-page-${timestamp}`, "page");

    try {
      const created = await dataLayer.createPage({
        id: pageId,
        title,
      });
      await this.reloadGroupItems();
      this.navigateToSelection({
        kind: "page",
        id: created?.id || pageId,
      });
    } catch (error) {
      console.error(error);
      window.alert(
        error instanceof Error ? error.message : "Failed to create page",
      );
    }
  }

  async createCollectionFromMenu() {
    const timestamp = Date.now();
    const title = `New Collection ${timestamp}`;
    const collectionId = this.toSafeId(
      `new-collection-${timestamp}`,
      "collection",
    );

    try {
      const created = await dataLayer.createCollection({
        id: collectionId,
        title,
      });
      const createdCollectionId = created?.id || collectionId;
      await this.reloadGroupItems();
      this.navigateToSelection({
        kind: "collection-config",
        collectionId: createdCollectionId,
      });
    } catch (error) {
      console.error(error);
      window.alert(
        error instanceof Error ? error.message : "Failed to create collection",
      );
    }
  }

  async createCollectionItemFromMenu(collectionId) {
    const normalizedCollectionId = String(collectionId || "").trim();
    if (!normalizedCollectionId) {
      return;
    }

    const timestamp = Date.now();
    const title = `New Item ${timestamp}`;
    const fallbackId = this.toSafeId(`new-item-${timestamp}`, "item");
    try {
      const created = await dataLayer.addCollectionItem(
        normalizedCollectionId,
        {
          id: fallbackId,
          title,
          excerpt: "",
          tags: [],
          metadata: {
            sourceUrl: `/${normalizedCollectionId}/${fallbackId}`,
          },
          content: [],
        },
      );
      const itemId = created?.id || fallbackId;
      await this.reloadGroupItems();
      this.navigateToSelection({
        kind: "collection-item",
        collectionId: normalizedCollectionId,
        itemId,
      });
    } catch (error) {
      console.error(error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to create collection item",
      );
    }
  }

  async createSharedComponentFromMenu() {
    const timestamp = Date.now();
    const title = `New Shared Component ${timestamp}`;
    const componentId = this.toSafeId(
      `new-shared-component-${timestamp}`,
      "shared-component",
    );

    try {
      const created = await dataLayer.createComponentConfig({
        id: componentId,
        title,
        content: [],
      });
      const createdComponentId = created?.id || componentId;
      await this.reloadGroupItems();
      this.navigateToSelection({
        kind: "shared",
        id: createdComponentId,
      });
    } catch (error) {
      console.error(error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to create shared component",
      );
    }
  }

  getRouteSelection() {
    if (typeof window === "undefined") {
      return { type: "page", pageId: "index" };
    }

    const params = new URLSearchParams(window.location.search);
    const type = params.get("type") || "page";

    if (type === "collection") {
      return {
        type: "collection",
        collectionId: params.get("collectionId") || "",
        itemId: params.get("itemId") || "",
      };
    }

    if (type === "collection-config") {
      return {
        type: "collection-config",
        collectionId: params.get("collectionId") || "",
      };
    }

    if (type === "shared") {
      return {
        type: "shared",
        componentId: params.get("componentId") || "",
      };
    }

    return {
      type: "page",
      pageId: params.get("pageId") || "index",
    };
  }

  navigateToSelection(selection) {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams();
    if (selection.kind === "collection-item") {
      params.set("type", "collection");
      params.set("collectionId", selection.collectionId || "");
      params.set("itemId", selection.itemId || "");
    } else if (selection.kind === "collection-config") {
      params.set("type", "collection-config");
      params.set("collectionId", selection.collectionId || "");
    } else if (selection.kind === "shared") {
      params.set("type", "shared");
      params.set("componentId", selection.id || "");
    } else {
      params.set("type", "page");
      params.set("pageId", selection.id || "index");
    }

    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, "", nextUrl);
    window.dispatchEvent(new CustomEvent("editor-route-change"));
  }

  isSelectionActive(selection) {
    const route = this.currentRoute || { type: "page", pageId: "index" };

    if (selection.kind === "collection-config") {
      return (
        route.type === "collection-config" &&
        route.collectionId === selection.collectionId
      );
    }

    if (selection.kind === "collection-item") {
      return (
        route.type === "collection" &&
        route.collectionId === selection.collectionId &&
        route.itemId === selection.itemId
      );
    }

    if (selection.kind === "shared") {
      return route.type === "shared" && route.componentId === selection.id;
    }

    return route.type === "page" && route.pageId === selection.id;
  }

  renderSelectableItem(selection) {
    const isActive = this.isSelectionActive(selection);
    const subtitle =
      selection.kind === "collection-config"
        ? `${selection.collectionTitle} / _config.json`
        : selection.kind === "collection-item"
          ? `${selection.collectionTitle} / ${selection.itemId}`
          : selection.kind === "shared"
            ? `/shared/${selection.id || ""}`
            : selection.url || selection.id;

    return html`
      <button
        class="group-item-button ${isActive ? "is-active" : ""}"
        type="button"
        @click=${() => this.navigateToSelection(selection)}
      >
        <span class="group-item-bullet"></span>
        <span class="group-item-copy">
          <span class="group-item-title">${selection.title}</span>
          <span class="group-item-subtitle">${subtitle}</span>
        </span>
      </button>
    `;
  }

  renderCollectionGroup(collectionGroup) {
    const collectionTitle = collectionGroup?.collectionTitle || "Collection";
    const collectionItems = Array.isArray(collectionGroup?.items)
      ? collectionGroup.items
      : [];
    const collectionId = String(collectionGroup?.collectionId || "").trim();
    const isExpanded = this.collectionSections?.[collectionId] ?? true;

    return html`
      <div class="collection-folder-group">
        <div class="collection-folder-title-row">
          <button
            class="collection-folder-toggle"
            type="button"
            aria-expanded=${String(isExpanded)}
            @click=${() => this.toggleCollectionSection(collectionId)}
          >
            <span class="collection-folder-title">${collectionTitle}</span>
            <span
              class="collection-folder-chevron ${isExpanded
                ? ""
                : "is-collapsed"}"
            >
              ${createElement(ChevronDown)}
            </span>
          </button>
          <button
            class="group-create-button"
            type="button"
            title="New collection item"
            @click=${() =>
              this.createCollectionItemFromMenu(collectionGroup.collectionId)}
          >
            ${createElement(Plus)}
          </button>
        </div>
        ${isExpanded
          ? html`
              <div class="collection-folder-items">
                ${this.renderSelectableItem(collectionGroup.config)}
                ${collectionItems.length > 0
                  ? collectionItems.map((item) =>
                      this.renderSelectableItem(item),
                    )
                  : html`
                      <div class="group-item">
                        <span class="group-item-bullet"></span>
                        <span>No items yet</span>
                      </div>
                    `}
              </div>
            `
          : html``}
      </div>
    `;
  }

  renderCollectionsItems(items, isFlyout = false) {
    const normalizedItems = items.length > 0 ? items : ["No collections yet"];

    return html`
      <div class="group-items ${isFlyout ? "is-flyout" : ""}">
        ${normalizedItems.map((item) => {
          if (typeof item === "string") {
            return html`
              <div class="group-item">
                <span class="group-item-bullet"></span>
                <span>${item}</span>
              </div>
            `;
          }

          return this.renderCollectionGroup(item);
        })}
      </div>
    `;
  }
  getStoredCollapsedState() {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(MENU_COLLAPSED_STORAGE_KEY) === "true";
  }

  persistCollapsedState() {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      MENU_COLLAPSED_STORAGE_KEY,
      String(this.collapsed),
    );
  }

  toggleSidebar() {
    this.collapsed = !this.collapsed;
    this.persistCollapsedState();
  }

  toggleSection(sectionKey) {
    this.sections = {
      ...this.sections,
      [sectionKey]: !this.sections[sectionKey],
    };
  }

  toggleCollectionSection(collectionId) {
    const normalizedCollectionId = String(collectionId || "").trim();
    if (!normalizedCollectionId) {
      return;
    }

    this.collectionSections = {
      ...(this.collectionSections || {}),
      [normalizedCollectionId]: !Boolean(
        this.collectionSections?.[normalizedCollectionId],
      ),
    };
  }

  handleGroupToggle(sectionKey) {
    if (this.collapsed) {
      return;
    }

    this.toggleSection(sectionKey);
  }

  renderGroup(sectionKey, title, icon, items) {
    const expanded = this.sections[sectionKey];
    const normalizedItems = items.length > 0 ? items : ["No items yet"];
    const isCollectionsSection = sectionKey === "collections";

    return html`
      <section class="menu-group">
        <button
          class="group-toggle"
          type="button"
          title=${title}
          aria-expanded=${this.collapsed ? "false" : String(expanded)}
          @click=${() => this.handleGroupToggle(sectionKey)}
        >
          <span class="section-icon">${createElement(icon)}</span>
          <span class="group-label">${title}</span>
          <span class="chevron ${expanded ? "" : "is-collapsed"}">
            ${createElement(ChevronDown)}
          </span>
        </button>
        ${expanded && !this.collapsed
          ? html`
              <div class="group-content-scroll">
                <div class="group-create-row">
                  <button
                    class="group-create-button"
                    type="button"
                    @click=${() => {
                      if (sectionKey === "pages") {
                        this.createPageFromMenu();
                        return;
                      }
                      if (sectionKey === "collections") {
                        this.createCollectionFromMenu();
                        return;
                      }
                      this.createSharedComponentFromMenu();
                    }}
                  >
                    ${createElement(Plus)}
                    <span>
                      ${sectionKey === "pages"
                        ? "New page"
                        : sectionKey === "collections"
                          ? "New collection"
                          : "New shared component"}
                    </span>
                  </button>
                </div>
                ${isCollectionsSection
                  ? this.renderCollectionsItems(normalizedItems)
                  : html`
                      <div class="group-items">
                        ${normalizedItems.map((item) =>
                          typeof item === "string"
                            ? html`
                                <div class="group-item">
                                  <span class="group-item-bullet"></span>
                                  <span>${item}</span>
                                </div>
                              `
                            : this.renderSelectableItem(item),
                        )}
                      </div>
                    `}
              </div>
            `
          : this.collapsed
            ? html`
                <div class="group-flyout-wrap">
                  <div class="group-flyout" role="menu" aria-label=${title}>
                    <div class="group-flyout-header">
                      <span class="section-icon">${createElement(icon)}</span>
                      <span class="group-flyout-title">${title}</span>
                    </div>
                    ${isCollectionsSection
                      ? this.renderCollectionsItems(normalizedItems, true)
                      : html`
                          <div class="group-items is-flyout">
                            ${normalizedItems.map((item) =>
                              typeof item === "string"
                                ? html`
                                    <div class="group-item">
                                      <span class="group-item-bullet"></span>
                                      <span>${item}</span>
                                    </div>
                                  `
                                : this.renderSelectableItem(item),
                            )}
                          </div>
                        `}
                  </div>
                </div>
              `
            : html``}
      </section>
    `;
  }

  render() {
    const isImporterRoute =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/editor/importer");

    return html`<aside class="sidebar ${this.collapsed ? "collapsed" : ""}">
      <div class="sidebar-header">
        <div class="brand">
          <div class="brand-icon">${createElement(Proportions)}</div>
          <div class="brand-copy">
            <span class="brand-title">Website Builder</span>
            <span class="brand-subtitle">Structure and assets</span>
          </div>
        </div>
        <button
          class="icon-button"
          type="button"
          title=${this.collapsed ? "Expand menu" : "Collapse menu"}
          @click=${() => this.toggleSidebar()}
        >
          ${createElement(this.collapsed ? PanelLeftOpen : PanelLeftClose)}
        </button>
      </div>

      <div class="menu-mode-toggle">
        <label>
          <input
            type="radio"
            name="menu-mode"
            .checked=${this.menuMode === "site-content"}
            @change=${() => this.setMenuMode("site-content")}
          />
          <span>Site Content</span>
        </label>
        <label>
          <input
            type="radio"
            name="menu-mode"
            .checked=${this.menuMode === "layers"}
            @change=${() => this.setMenuMode("layers")}
          />
          <span>Layers</span>
        </label>
      </div>

      ${this.menuMode === "site-content"
        ? html`
            <div class="menu-groups">
              ${this.renderGroup(
                "pages",
                "Pages",
                Files,
                this.groupItems.pages,
              )}
              ${this.renderGroup(
                "collections",
                "Collections",
                Database,
                this.groupItems.collections,
              )}
              ${this.renderGroup(
                "shared",
                "Shared",
                Blocks,
                this.groupItems.shared,
              )}
            </div>
          `
        : html`
            <div class="menu-groups layers-groups">
              <section class="menu-group">
                <div class="group-toggle static">
                  <span class="section-icon">${createElement(Files)}</span>
                  <span class="group-label">Layers</span>
                </div>
                <div class="group-content-scroll layers-scroll">
                  ${this.renderLayersTree()}
                </div>
              </section>
            </div>
          `}

      <div class="sidebar-footer">
        <button
          class="settings-button"
          type="button"
          title=${isImporterRoute ? "Back to editor" : "Importer"}
          @click=${() => {
            window.location.href = isImporterRoute
              ? "/editor/"
              : "/editor/importer/";
          }}
        >
          ${createElement(Upload)}
          <span class="settings-label"
            >${isImporterRoute ? "Back to editor" : "Importer"}</span
          >
        </button>
      </div>
    </aside>`;
  }
}
customElements.define("editor-menu", EditorMenu);
