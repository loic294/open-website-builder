import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import {
  ArrowDown,
  ArrowUp,
  Trash,
  Pencil,
  createElement,
} from "lucide/dist/cjs/lucide";
import styles from "./styles.css?inline";

export class SiteSection extends EditorComponent {
  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
  };

  static styles = unsafeCSS(styles);

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
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

  addSection(position) {
    const nextPageConfig = addSectionAfter(
      this.pageConfig,
      this.node,
      position,
    );
    this.dispatchPageConfigUpdated(nextPageConfig);
  }

  moveSection(direction) {
    const nextPageConfig = moveSection(this.pageConfig, this.node, direction);
    this.dispatchPageConfigUpdated(nextPageConfig);
  }

  openSectionSettings() {
    this.openSettingsEditor(html`
      <h3>Section settings</h3>
      <p>Settings editor placeholder for section ${this.node?.id ?? ""}.</p>
      <editor-btn @click=${() => this.closeSettingsEditor()}>Close</editor-btn>
    `);
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
          <editor-btn
            style="light"
            title="Move section up"
            @click=${() => this.moveSection("up")}
            >${createElement(ArrowUp)}</editor-btn
          >
          <editor-btn
            style="light"
            title="Move section down"
            @click=${() => this.moveSection("down")}
            >${createElement(ArrowDown)}</editor-btn
          >
          <editor-btn style="light" @click=${() => this.openSectionSettings()}
            >${createElement(Pencil)} Edit</editor-btn
          >
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

export function addSectionAfter(pageConfig, node, position = "after") {
  const content = Array.isArray(pageConfig?.content) ? pageConfig.content : [];
  const index = content.indexOf(node);
  const timestamp = Date.now();
  const nextSection = {
    id: `section-${timestamp}`,
    type: "section",
    content: [
      {
        id: `text-${timestamp}`,
        type: "text",
        content: `New section ${timestamp}`,
      },
    ],
  };

  const nextContent = [...content];

  if (index === -1) {
    nextContent.push(nextSection);
  } else {
    const insertionIndex = position === "before" ? index : index + 1;
    nextContent.splice(insertionIndex, 0, nextSection);
  }

  return {
    ...pageConfig,
    content: nextContent,
  };
}

export function moveSection(pageConfig, node, direction) {
  const content = Array.isArray(pageConfig?.content)
    ? [...pageConfig.content]
    : [];
  const index = content.indexOf(node);

  if (index === -1) {
    return pageConfig;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= content.length) {
    return pageConfig;
  }

  const [movedSection] = content.splice(index, 1);
  content.splice(targetIndex, 0, movedSection);

  return {
    ...pageConfig,
    content,
  };
}

export const editorRenderSiteSection = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
) => {
  const children = Array.isArray(node.content) ? node.content : [];
  return html`<site-section
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  >
    ${children.map((child) =>
      renderNode(child, pageConfig, onPageConfigUpdated, renderNode),
    )}
  </site-section>`;
};

customElements.define("site-section", SiteSection);
