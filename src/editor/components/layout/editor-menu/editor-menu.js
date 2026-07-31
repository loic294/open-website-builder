import { LitElement, html, unsafeCSS } from "lit";
import {
  Blocks,
  ChevronDown,
  Database,
  Files,
  FolderOpen,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Proportions,
  Upload,
  Settings2,
  Layers2,
  FileCog,
  createElement,
} from "lucide";
import { dataLayer } from "../../../data/data-layer.js";
import { FileManager } from "../file-manager/file-manager.js";
import { browserPopover } from "../../ui/browser-popover/browser-popover.js";
import "../page-settings/page-settings.js";
import styles from "./styles.css?inline";
import daisyUI from "../../../styles/daisyui.css?inline";

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
    menuMode: { type: String, reflect: true, attribute: "menu-mode" },
    layersConfig: { state: true },
    layerSections: { state: true },
    activeLayerNodeId: { state: true },
    dropTargetKey: { state: true },
    isDragging: { state: true },
  };

  static styles = [unsafeCSS(daisyUI), unsafeCSS(styles)];

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
      return "pages";
    }

    const value = window.localStorage.getItem(MENU_MODE_STORAGE_KEY);
    return value;
  }

  persistMenuMode() {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(MENU_MODE_STORAGE_KEY, this.menuMode);
  }

  setMenuMode(nextMode) {
    this.menuMode = nextMode;
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
            title: html`<span class="w-full flex gap-2 items-center"> </span>`,
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
    this.activeLayerNodeId = sourceId;
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
      await browserPopover.alert(
        error instanceof Error ? error.message : "Failed to create page",
        { title: "Page creation failed" },
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
      await browserPopover.alert(
        error instanceof Error ? error.message : "Failed to create collection",
        { title: "Collection creation failed" },
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
      await browserPopover.alert(
        error instanceof Error
          ? error.message
          : "Failed to create collection item",
        { title: "Item creation failed" },
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
      await browserPopover.alert(
        error instanceof Error
          ? error.message
          : "Failed to create shared component",
        { title: "Component creation failed" },
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
      <li>
        <a
          class=${`${isActive ? "menu-active" : ""}`}
          @click=${() => this.navigateToSelection(selection)}
        >
          <span class="flex min-w-0 flex-col items-start">
            <span class="w-full truncate">${selection.title}</span>
            ${selection.kind !== "collection-config"
              ? html`
                  <span class="w-full truncate text-[9px] opacity-60"
                    >${subtitle}</span
                  >
                `
              : html``}
          </span>
        </a>
      </li>
    `;
  }

  renderCollectionGroup(collectionGroup) {
    const collectionTitle = collectionGroup?.collectionTitle || "Collection";
    const collectionItems = Array.isArray(collectionGroup?.items)
      ? collectionGroup.items
      : [];
    const collectionId = String(collectionGroup?.collectionId || "").trim();
    const hasActiveSelection =
      this.isSelectionActive(collectionGroup.config) ||
      collectionItems.some((item) => this.isSelectionActive(item));

    return html`
      <li>
        <details ?open=${hasActiveSelection}>
          <summary>${collectionTitle}</summary>
          <div class="flex gap-2 mt-2 mb-4">
            <button
              class="btn btn-primary flex-1"
              @click=${() => this.createCollectionItemFromMenu(collectionId)}
            >
              ${createElement(Plus)} New item
            </button>

            <button
              class="btn btn-outline flex-1"
              @click=${() => this.navigateToSelection(collectionGroup.config)}
            >
              ${createElement(Settings2)} Settings
            </button>
          </div>
          <ul>
            ${collectionItems.map((item) => this.renderSelectableItem(item))}
            ${collectionItems.length === 0
              ? html`<li class="menu-disabled"><a>No items yet</a></li>`
              : html``}
          </ul>
        </details>
      </li>
    `;
  }

  renderCollectionsItems(items) {
    const normalizedItems = items.length > 0 ? items : ["No collections yet"];

    return normalizedItems.map((item) =>
      typeof item === "string"
        ? html`<li class="menu-disabled"><a>${item}</a></li>`
        : this.renderCollectionGroup(item),
    );
  }

  buildPagesTree(pages) {
    const root = { page: null, children: new Map() };

    for (const page of pages) {
      const rawPath = String(page?.url || page?.id || "").trim();
      const pathname = new URL(rawPath || "/", "http://editor.local").pathname;
      const segments = pathname.split("/").filter(Boolean);
      let node = root;

      for (const segment of segments) {
        if (!node.children.has(segment)) {
          node.children.set(segment, {
            segment: decodeURIComponent(segment),
            page: null,
            children: new Map(),
          });
        }
        node = node.children.get(segment);
      }

      node.page = page;
    }

    return root;
  }

  pageTreeNodeHasActiveSelection(node) {
    if (node.page && this.isSelectionActive(node.page)) {
      return true;
    }

    return Array.from(node.children.values()).some((child) =>
      this.pageTreeNodeHasActiveSelection(child),
    );
  }

  renderPageTreeNode(node) {
    const children = Array.from(node.children.values());
    if (children.length === 0 && node.page) {
      return this.renderSelectableItem(node.page);
    }

    const isParentPageActive = node.page && this.isSelectionActive(node.page);

    return html`
      <li>
        <details ?open=${this.pageTreeNodeHasActiveSelection(node)}>
          <summary
            class=${isParentPageActive ? "menu-active" : ""}
            @click=${node.page
              ? () => this.navigateToSelection(node.page)
              : null}
          >
            ${node.page
              ? html`
                  <span class="flex min-w-0 flex-col items-start">
                    <span class="w-full truncate">${node.page.title}</span>
                    <span class="w-full truncate text-[9px] opacity-60">
                      ${node.page.url || node.page.id}
                    </span>
                  </span>
                `
              : node.segment}
          </summary>
          <ul>
            ${children.map((child) => this.renderPageTreeNode(child))}
          </ul>
        </details>
      </li>
    `;
  }

  renderPagesItems(items) {
    if (items.length === 0) {
      return html`<li class="menu-disabled"><a>No pages yet</a></li>`;
    }

    const root = this.buildPagesTree(items);
    return html`
      ${root.page ? this.renderSelectableItem(root.page) : html``}
      ${Array.from(root.children.values()).map((node) =>
        this.renderPageTreeNode(node),
      )}
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
    const isPagesSection = sectionKey === "pages";

    return html`
      <section class="menu-group">
        <div class="flex items-center gap-2 py-2 justify-between">
          <div>
            <span class="section-icon">${createElement(icon)}</span>
            <span class="group-label">${title}</span>
          </div>
          <button
            class="btn btn-sm"
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
                  : "New component"}
            </span>
          </button>
        </div>
        ${expanded && !this.collapsed
          ? html`
              <div class="group-content-scroll">
                <ul
                  class=${isPagesSection
                    ? "menu bg-base-200 rounded-box w-full"
                    : "menu menu-paged menu-vertical bg-base-200 rounded-box w-full"}
                >
                  ${isPagesSection
                    ? this.renderPagesItems(items)
                    : isCollectionsSection
                      ? this.renderCollectionsItems(normalizedItems)
                      : normalizedItems.map((item) =>
                          typeof item === "string"
                            ? html`<li class="menu-disabled">
                                <a>${item}</a>
                              </li>`
                            : this.renderSelectableItem(item),
                        )}
                </ul>
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
                    <ul
                      class=${isPagesSection
                        ? "menu bg-base-200 rounded-box w-full"
                        : "menu menu-paged menu-vertical w-full"}
                    >
                      ${isPagesSection
                        ? this.renderPagesItems(items)
                        : isCollectionsSection
                          ? this.renderCollectionsItems(normalizedItems)
                          : normalizedItems.map((item) =>
                              typeof item === "string"
                                ? html`<li class="menu-disabled">
                                    <a>${item}</a>
                                  </li>`
                                : this.renderSelectableItem(item),
                            )}
                    </ul>
                  </div>
                </div>
              `
            : html``}
      </section>
    `;
  }

  render() {
    let menuContent = html``;

    if (this.menuMode === "pages") {
      menuContent = this.renderGroup(
        "pages",
        "Pages",
        Files,
        this.groupItems.pages,
      );
    } else if (this.menuMode === "collections") {
      menuContent = this.renderGroup(
        "collections",
        "Collections",
        Database,
        this.groupItems.collections,
      );
    } else if (this.menuMode === "shared") {
      menuContent = this.renderGroup(
        "shared",
        "Shared",
        Blocks,
        this.groupItems.shared,
      );
    } else if (this.menuMode === "layers") {
      menuContent = html`
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
      `;
    } else if (this.menuMode === "settings") {
      menuContent = html`
        <div class="menu-groups settings-groups">
          <div class="group-toggle static">
            <span class="section-icon">${createElement(FileCog)}</span>
            <span class="group-label">Page Settings</span>
          </div>
          <div class="settings-scroll">
            <page-settings></page-settings>
          </div>
        </div>
      `;
    }

    const isImporterRoute =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/editor/importer");

    return html`<aside
      class="sidebar bg-transparent ${this.collapsed ? "collapsed" : ""}"
      data-theme="mylight"
    >
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

      <div class="main-menu">
        <ul class="menu bg-base-200 rounded-box w-full mb-4">
          <li>
            <a
              class=${this.menuMode === "pages" ? "menu-active" : ""}
              @click=${() => this.setMenuMode("pages")}
            >
              ${createElement(Files)} Pages
            </a>
          </li>
          <li>
            <a
              class=${this.menuMode === "collections" ? "menu-active" : ""}
              @click=${() => this.setMenuMode("collections")}
            >
              ${createElement(Database)} Collections
            </a>
          </li>
          <li>
            <a
              class=${this.menuMode === "shared" ? "menu-active" : ""}
              @click=${() => this.setMenuMode("shared")}
            >
              ${createElement(Blocks)} Shared Components
            </a>
          </li>
          <div class="divider my-px"></div>
          <li>
            <a
              class=${this.menuMode === "layers" ? "menu-active" : ""}
              @click=${() => this.setMenuMode("layers")}
            >
              ${createElement(Layers2)} Page Layers
            </a>
          </li>
          <li>
            <a
              class=${this.menuMode === "settings" ? "menu-active" : ""}
              @click=${() => this.setMenuMode("settings")}
            >
              ${createElement(FileCog)} Page Settings
            </a>
          </li>
        </ul>
      </div>

      ${menuContent}

      <div class="sidebar-footer">
        <button
          class="settings-button"
          type="button"
          title="File Manager"
          @click=${() =>
            FileManager.open({ mode: "multi", onSelect: () => {} })}
        >
          ${createElement(FolderOpen)}
          <span class="settings-label">File Manager</span>
        </button>
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
