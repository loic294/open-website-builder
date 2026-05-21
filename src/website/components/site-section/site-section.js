import { LitElement, html, unsafeCSS } from "lit";
import { Trash, Pencil, createElement } from "lucide/dist/cjs/lucide";
import styles from "./styles.css?inline";

export class SiteSection extends LitElement {
  static styles = unsafeCSS(styles);

  addSection(position) {
    this.dispatchEvent(
      new CustomEvent("add-section", {
        detail: {
          position: position,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`<div>
      <section>
        <editor-btn
          style="primary"
          class="add-section-button"
          @click=${() => this.addSection("before")}
        >
          Add section
        </editor-btn>
        <div class="section-controls">
          <editor-btn style="light">${createElement(Pencil)} Edit</editor-btn>
          <editor-btn style="light text-danger"
            >${createElement(Trash)}</editor-btn
          >
        </div>
        <div class="container">
          <slot></slot>
        </div>
        <editor-btn
          style="primary"
          class="add-section-button bottom"
          @click=${() => this.addSection("after")}
        >
          Add section
        </editor-btn>
      </section>
    </div>`;
  }
}

export const editorRenderSiteSection = (
  node,
  onAddSection,
  onContentChanged,
  renderNode,
) => {
  const children = Array.isArray(node.content) ? node.content : [];
  return html`<site-section
    @add-section=${(event) => {
      event.stopPropagation();
      onAddSection(node, event.detail?.position);
    }}
  >
    ${children.map((child) =>
      renderNode(child, onAddSection, onContentChanged, renderNode),
    )}
  </site-section>`;
};

customElements.define("site-section", SiteSection);
