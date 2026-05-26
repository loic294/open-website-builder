import { LitElement, html, css, unsafeCSS } from "lit";
import {
  Monitor,
  Tablet,
  Smartphone,
  RectangleHorizontal,
  RectangleVertical,
  createElement,
} from "lucide";

import "../../ui/button/button.js";
import "../../ui/radio-button/radio-button.js";
import { renderNode } from "../../../core/render-node.js";
import { dataLayer } from "../../../data/data-layer.js";

import "../../../../website/components/site-section/site-section.js";
import "../../../../website/components/text/text.js";
import "../../../../website/components/image/image.js";
import "../../../../website/components/button/button.js";
import "../../../../website/components/embed/embed.js";
import "../../../../website/components/social-media/social-media.js";
import "../../../../website/components/gallery/gallery.js";

import baseStyle from "../../../../website/styles/base.css?inline";
import styles from "./website-editor-styles.css?inline";

class WebsiteEditor extends LitElement {
  static properties = {
    pageConfig: { state: true },
    publishStatus: { state: true },
    activeView: { state: true },
    activeSize: { state: true },
    activeOrientation: { state: true },
    currentSelection: { state: true },
  };

  static styles = [unsafeCSS(baseStyle), unsafeCSS(styles), css``];

  constructor() {
    super();
    this.pageConfig = null;
    this.didLoadConfig = false;
    this.publishStatus = "";
    this.activeView = "editor";
    this.activeSize = "desktop";
    this.activeOrientation = "vertical";
    this.currentSelection = { type: "page", pageId: "index" };
  }

  viewOptions = [
    { label: "Editor", value: "editor" },
    { label: "Preview", value: "preview" },
    { label: "Settings", value: "settings" },
  ];

  sizeOptions = [
    { label: html`${createElement(Monitor)}`, value: "desktop" },
    { label: html`${createElement(Tablet)}`, value: "tablet" },
    { label: html`${createElement(Smartphone)}`, value: "mobile" },
  ];

  orientationOptions = [
    {
      label: html`${createElement(RectangleHorizontal)} Horizontal`,
      value: "horizontal",
    },
    {
      label: html`${createElement(RectangleVertical)} Vertical`,
      value: "vertical",
    },
  ];

  async connectedCallback() {
    super.connectedCallback();

    this.onRouteChanged = async () => {
      await this.loadSelectionFromRoute();
    };

    window.addEventListener("popstate", this.onRouteChanged);
    window.addEventListener("editor-route-change", this.onRouteChanged);

    if (!this.didLoadConfig) {
      this.didLoadConfig = true;
      await this.loadSelectionFromRoute();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this.onRouteChanged);
    window.removeEventListener("editor-route-change", this.onRouteChanged);
  }

  getRouteSelection() {
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

  async loadSelectionFromRoute() {
    const selection = this.getRouteSelection();
    this.currentSelection = selection;

    try {
      if (selection.type === "collection") {
        const item = await dataLayer.getCollectionItemContent(
          selection.collectionId,
          selection.itemId,
        );

        this.pageConfig = {
          ...item,
          id: item?.id || selection.itemId,
          title: item?.title || selection.itemId || "Collection item",
          url:
            item?.url ||
            `/collections/${selection.collectionId}/${selection.itemId}`,
          content: Array.isArray(item?.content) ? item.content : [],
        };
        return;
      }

      if (selection.type === "shared") {
        const componentConfig = await dataLayer.getComponentConfig(
          selection.componentId,
        );

        this.pageConfig = {
          ...componentConfig,
          type: "shared",
          id: componentConfig?.id || selection.componentId,
          title:
            componentConfig?.title ||
            selection.componentId ||
            "Shared component",
          url: `/shared/${selection.componentId}`,
          content: Array.isArray(componentConfig?.content)
            ? componentConfig.content
            : [],
        };
        return;
      }

      this.pageConfig = await dataLayer.getPageConfig(selection.pageId);
    } catch (error) {
      console.error(error);
      this.pageConfig = {
        type: "page",
        id:
          selection.type === "collection"
            ? selection.itemId || "item"
            : selection.type === "shared"
              ? selection.componentId || "component"
              : selection.pageId || "home",
        title:
          selection.type === "collection"
            ? selection.itemId || "Collection item"
            : selection.type === "shared"
              ? selection.componentId || "Shared component"
              : "Home",
        url:
          selection.type === "collection"
            ? `/collections/${selection.collectionId}/${selection.itemId}`
            : selection.type === "shared"
              ? `/shared/${selection.componentId}`
              : "/",
        content: [],
      };
    }
  }

  onPageConfigUpdated = async (event) => {
    event.stopPropagation();
    this.pageConfig = event.detail;

    try {
      if (this.currentSelection?.type === "collection") {
        await dataLayer.updateCollectionItem(
          this.currentSelection.collectionId,
          this.currentSelection.itemId,
          this.pageConfig,
        );
      } else if (this.currentSelection?.type === "shared") {
        await dataLayer.saveComponentConfig(
          this.currentSelection.componentId,
          this.pageConfig,
        );
      } else {
        await dataLayer.savePageConfig(
          this.currentSelection?.pageId || "index",
          this.pageConfig,
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  onPublishClick = async () => {
    this.publishStatus = "Publishing...";
    try {
      const result = await dataLayer.publishSite();
      const pagesCount = Array.isArray(result?.pages) ? result.pages.length : 0;
      this.publishStatus = `Published ${pagesCount} page(s)`;
    } catch (error) {
      console.error(error);
      this.publishStatus =
        error instanceof Error
          ? `Publish failed: ${error.message}`
          : "Publish failed";
    }
  };

  onActiveViewChange = (event) => {
    this.activeView = event.detail.value;
  };

  onActiveSizeChange = (event) => {
    this.activeSize = event.detail.value;
  };

  onActiveOrientationChange = (event) => {
    this.activeOrientation = event.detail.value;
  };

  renderViewContent(content) {
    if (this.activeView === "preview") {
      return html`<div class="view-placeholder">Preview section</div>`;
    }

    if (this.activeView === "settings") {
      return html`<div class="view-placeholder">Settings section</div>`;
    }

    return content.map((node) =>
      renderNode(node, this.pageConfig, this.onPageConfigUpdated, renderNode),
    );
  }

  render() {
    if (!this.pageConfig) {
      return html``;
    }

    const content = Array.isArray(this.pageConfig?.content)
      ? this.pageConfig.content
      : [];

    return html`<div class="editor">
      <div class="editor-top-menu">
        <div class="left-menu">
          <div class="page-info">
            <div class="page-info-main">
              <span class="page-title"
                >${this.pageConfig?.title ||
                this.pageConfig?.id ||
                "Untitled"}</span
              >
            </div>
            <span class="page-path"
              >${this.pageConfig?.url ||
              (this.currentSelection?.type === "collection"
                ? `/collections/${this.currentSelection.collectionId}/${this.currentSelection.itemId}`
                : this.currentSelection?.type === "shared"
                  ? `/shared/${this.currentSelection.componentId}`
                  : `/${this.currentSelection?.pageId || "index"}`)}</span
            >
          </div>
          <div class="view-mode-switcher">
            <editor-radio-button
              .options=${this.viewOptions}
              .value=${this.activeView}
              @change=${this.onActiveViewChange}
              disabledTooltip=${true}
            ></editor-radio-button>
          </div>
        </div>
        <div class="right-menu">
          <div class="size-switcher">
            <editor-radio-button
              .options=${this.sizeOptions}
              .value=${this.activeSize}
              @change=${this.onActiveSizeChange}
              disabledTooltip=${true}
            ></editor-radio-button>
          </div>
          <editor-btn @click=${this.onPublishClick}>Publish</editor-btn>
          ${this.publishStatus
            ? html`<span
                style="margin-left: 10px; font-size: 12px; opacity: 0.8;"
                >${this.publishStatus}</span
              >`
            : null}
        </div>
      </div>
      <div class="website website-container">
        ${this.activeSize !== "desktop"
          ? html`<div class="orientation-switcher">
              <editor-radio-button
                .options=${this.orientationOptions}
                .value=${this.activeOrientation}
                @change=${this.onActiveOrientationChange}
                disabledTooltip=${true}
              ></editor-radio-button>
            </div>`
          : ""}
        <div
          class="website-viewport size-${this.activeSize} orientation-${this
            .activeOrientation}"
        >
          ${this.renderViewContent(content)}
        </div>
      </div>
    </div>`;
  }
}

customElements.define("website-editor", WebsiteEditor);
