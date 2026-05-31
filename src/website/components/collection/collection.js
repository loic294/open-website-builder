import { html, LitElement } from "lit";
import { defaultSectionConfig } from "../site-section/site-section.js";

export const defaultCollectionConfig = {
  ...defaultSectionConfig,
  type: "collection",
  content: [],
  settings: {
    settingCollectionId: "",
    settingCollectionItemsCount: "all",
    settingCollectionSort: "disk",
  },
};

export class OwbCollection extends LitElement {
  static editorPlugin = null;

  static properties = {
    settings: { type: Object },
    node: { type: Object },
    pageConfig: { type: Object },
  };

  constructor() {
    super();
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.renderRoot
      .querySelectorAll("script[data-owb-config]")
      .forEach((el) => {
        el.remove();
      });
    OwbCollection.editorPlugin?.onConnected?.(this);
  }

  disconnectedCallback() {
    OwbCollection.editorPlugin?.onDisconnected?.(this);
    super.disconnectedCallback();
  }

  willUpdate(changedProperties) {
    OwbCollection.editorPlugin?.onWillUpdate?.(this, changedProperties);
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbCollection.editorPlugin?.onUpdated?.(this, changedProperties);
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

  render() {
    const pluginRender = OwbCollection.editorPlugin?.render;
    if (typeof pluginRender === "function") {
      return pluginRender(this);
    }
    return html`<link rel="stylesheet" href="/owb-styles/site-section.css" />
      <link rel="stylesheet" href="/owb-styles/collection.css" />
      <div class="collection"><slot></slot></div>`;
  }
}

if (!customElements.get("owb-collection")) {
  customElements.define("owb-collection", OwbCollection);
}
