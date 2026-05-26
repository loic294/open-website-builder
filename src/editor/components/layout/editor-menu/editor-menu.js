import { LitElement, html, unsafeCSS } from "lit";
import {
  Blocks,
  ChevronDown,
  Database,
  Files,
  PanelLeftClose,
  PanelLeftOpen,
  Proportions,
  Upload,
  createElement,
} from "lucide";
import { dataLayer } from "../../../data/data-layer.js";
import styles from "./styles.css?inline";

const MENU_COLLAPSED_STORAGE_KEY = "editor-menu-collapsed";

class EditorMenu extends LitElement {
  static properties = {
    collapsed: { type: Boolean, reflect: true },
    sections: { state: true },
    groupItems: { state: true },
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
    this.didLoadData = false;
    this.currentRoute = this.getRouteSelection();
  }

  async connectedCallback() {
    super.connectedCallback();

    this.onRouteChanged = () => {
      this.currentRoute = this.getRouteSelection();
    };
    window.addEventListener("popstate", this.onRouteChanged);
    window.addEventListener("editor-route-change", this.onRouteChanged);

    if (this.didLoadData) {
      return;
    }

    this.didLoadData = true;

    const [pagesResult, collectionsResult, sharedResult] =
      await Promise.allSettled([
        dataLayer.listPages(),
        dataLayer.getAllCollectionsContent(),
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
      collections: collectionsContent.flatMap((collection) => {
        const collectionId = collection?.collectionId || "";
        const collectionTitle =
          collection?.title || collectionId || "Collection";
        const items = Array.isArray(collection?.items) ? collection.items : [];
        return items.map((item) => ({
          kind: "collection-item",
          collectionId,
          collectionTitle,
          itemId: item?.id || "",
          title: item?.title || item?.id || "Untitled",
        }));
      }),
      shared: sharedComponents.map((component) => ({
        kind: "shared",
        id: component?.id || "",
        title: component?.title || component?.id || "Untitled",
      })),
    };
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this.onRouteChanged);
    window.removeEventListener("editor-route-change", this.onRouteChanged);
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
      selection.kind === "collection-item"
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
            `
          : this.collapsed
            ? html`
                <div class="group-flyout-wrap">
                  <div class="group-flyout" role="menu" aria-label=${title}>
                    <div class="group-flyout-header">
                      <span class="section-icon">${createElement(icon)}</span>
                      <span class="group-flyout-title">${title}</span>
                    </div>
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

      <div class="menu-groups">
        ${this.renderGroup("pages", "Pages", Files, this.groupItems.pages)}
        ${this.renderGroup(
          "collections",
          "Collections",
          Database,
          this.groupItems.collections,
        )}
        ${this.renderGroup("shared", "Shared", Blocks, this.groupItems.shared)}
      </div>

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
