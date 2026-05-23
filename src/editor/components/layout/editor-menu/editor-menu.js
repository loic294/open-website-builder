import { LitElement, html, unsafeCSS } from "lit";
import {
  Blocks,
  ChevronDown,
  Cog,
  Database,
  Files,
  PanelLeftClose,
  PanelLeftOpen,
  Proportions,
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
  }

  async connectedCallback() {
    super.connectedCallback();

    if (this.didLoadData) {
      return;
    }

    this.didLoadData = true;

    try {
      const [pages, collections, sharedComponents] = await Promise.all([
        dataLayer.listPages(),
        dataLayer.listCollections(),
        dataLayer.listSharedComponents(),
      ]);

      this.groupItems = {
        pages: pages.map((page) => page?.title || page?.id || "Untitled"),
        collections: collections.map(
          (collection) => collection?.title || collection?.id || "Untitled",
        ),
        shared: sharedComponents.map(
          (component) => component?.title || component?.id || "Untitled",
        ),
      };
    } catch (error) {
      console.error(error);
      this.groupItems = {
        pages: [],
        collections: [],
        shared: [],
      };
    }
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
                ${normalizedItems.map(
                  (item) => html`
                    <div class="group-item">
                      <span class="group-item-bullet"></span>
                      <span>${item}</span>
                    </div>
                  `,
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
                      ${normalizedItems.map(
                        (item) => html`
                          <div class="group-item">
                            <span class="group-item-bullet"></span>
                            <span>${item}</span>
                          </div>
                        `,
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
        <button class="settings-button" type="button" title="Settings">
          ${createElement(Cog)}
          <span class="settings-label">Settings</span>
        </button>
      </div>
    </aside>`;
  }
}
customElements.define("editor-menu", EditorMenu);
