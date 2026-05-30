import { html, LitElement, css } from "lit";
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

  static styles = [
    css`
      :host {
        display: block;
      }

      .collection {
        margin: 0 auto;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.renderRoot
      .querySelectorAll("script[data-owb-config]")
      .forEach((el) => {
        el.remove();
      });
  }

  render() {
    return html`<div class="collection"><slot></slot></div>`;
  }
}

if (!customElements.get("owb-collection")) {
  customElements.define("owb-collection", OwbCollection);
}
