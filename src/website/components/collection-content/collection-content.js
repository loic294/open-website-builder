import { html, LitElement, css } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";

class SiteCollectionContent extends EditorComponent {
  static styles = [
    super.styles,
    css`
      :host {
        display: block;
      }

      .collection-content-placeholder {
        padding: 16px;
        border: 1px dashed var(--editor-muted-text-color);
        border-radius: var(--editor-sharp-radius);
        background: color-mix(
          in srgb,
          var(--editor-background) 60%,
          var(--editor-white-color)
        );
        color: var(--editor-muted-text-color);
        font-size: 12px;
      }
    `,
  ];

  openCollectionContentSettings() {
    this.openSettingsEditor(html`
      <div>
        <p>
          This marker shows where a collection item's content should be injected
          when rendering a collection template.
        </p>
      </div>
    `);
  }

  render() {
    return html`
      <div
        class="collection-content-placeholder"
        data-editor-block
        @click=${() => this.openCollectionContentSettings()}
      >
        Collection content
      </div>
    `;
  }
}

class OwbCollectionContent extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
      }
    `,
  ];

  render() {
    return html`<slot></slot>`;
  }
}

export const editorRenderCollectionContent = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-collection-content
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .renderNodeFn=${renderNode}
    .onPageConfigUpdated=${onPageConfigUpdated}
    @page-config-updated=${onPageConfigUpdated}
  ></site-collection-content>`;
};

if (!customElements.get("site-collection-content")) {
  customElements.define("site-collection-content", SiteCollectionContent);
}

if (!customElements.get("owb-collection-content")) {
  customElements.define("owb-collection-content", OwbCollectionContent);
}
