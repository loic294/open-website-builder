import { LitElement, html, unsafeCSS } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { Code2, createElement } from "lucide";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import styles from "./styles.css?inline";

export const defaultEmbedConfig = {
  type: "embed",
  html: "",
};

function sanitizeEmbedHtmlForEditor(rawHtml) {
  const htmlString = String(rawHtml || "");
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(htmlString, "text/html");

  documentNode.querySelectorAll("script").forEach((scriptNode) => {
    scriptNode.remove();
  });

  const allNodes = documentNode.querySelectorAll("*");
  allNodes.forEach((node) => {
    const attributeNames = node.getAttributeNames();
    attributeNames.forEach((attributeName) => {
      const lower = attributeName.toLowerCase();
      const value = String(node.getAttribute(attributeName) || "").trim();

      if (lower.startsWith("on")) {
        node.removeAttribute(attributeName);
        return;
      }

      if (
        (lower === "href" || lower === "src") &&
        /^javascript:/i.test(value)
      ) {
        node.removeAttribute(attributeName);
        return;
      }

      if (lower === "srcdoc") {
        node.removeAttribute(attributeName);
      }
    });
  });

  return documentNode.body.innerHTML;
}

function sanitizeEmbedHtml(rawHtml) {
  return sanitizeEmbedHtmlForEditor(rawHtml);
}

class SiteEmbed extends withVariantConfig(EditorComponent) {
  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    embedHtml: { type: String },
  };

  static styles = [super.styles, unsafeCSS(styles)];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.embedHtml = "";
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.embedHtml =
        this.node && typeof this.node.html === "string" ? this.node.html : "";
    }
  }

  updateNodeHtml(nodes, targetNodeId, nextHtml) {
    return nodes.map((currentNode) => {
      if (currentNode?.id === targetNodeId && currentNode?.type === "embed") {
        return {
          ...currentNode,
          html: nextHtml,
        };
      }

      if (Array.isArray(currentNode?.content)) {
        return {
          ...currentNode,
          content: this.updateNodeHtml(
            currentNode.content,
            targetNodeId,
            nextHtml,
          ),
        };
      }

      return currentNode;
    });
  }

  updateEmbedHtml(nextHtml) {
    this.embedHtml = nextHtml;

    if (!this.pageConfig || !this.node?.id) {
      return;
    }

    const nextPageConfig = {
      ...this.pageConfig,
      content: this.updateNodeHtml(
        Array.isArray(this.pageConfig.content) ? this.pageConfig.content : [],
        this.node.id,
        nextHtml,
      ),
    };

    this.node = {
      ...this.node,
      html: nextHtml,
    };
    this.pageConfig = nextPageConfig;
    this.dispatchPageConfigUpdated(nextPageConfig);
  }

  openEmbedSettings() {
    this.openSettingsEditor({
      tabs: [{ id: "general", label: "General" }],
      content: () => html`
        <settings-section title="Embed HTML">
          <textarea
            class="embed-textarea"
            .value=${this.embedHtml}
            placeholder="Paste any HTML embed code"
            @input=${(event) => this.updateEmbedHtml(event.target.value)}
          ></textarea>
          <p class="embed-help">
            Scripts are stored but disabled in editor preview.
          </p>
        </settings-section>
      `,
    });
  }

  openEmbedSettingsIfNeeded() {
    if (this.isSettingsEditorOpen) {
      return;
    }

    this.openEmbedSettings();
  }

  render() {
    const sanitizedHtml = sanitizeEmbedHtmlForEditor(this.embedHtml);

    return html`
      <div
        data-editor-block
        @pointerdown=${() => this.openEmbedSettingsIfNeeded()}
        class="embed-block ${this.isSettingsEditorOpen
          ? "is-settings-open"
          : ""}"
      >
        ${sanitizedHtml.trim()
          ? html`<div class="embed-preview">${unsafeHTML(sanitizedHtml)}</div>`
          : html`
              <div class="embed-placeholder">
                ${createElement(Code2)}
                <span>Add HTML in settings to preview embed content.</span>
              </div>
            `}
      </div>
    `;
  }
}

export const editorRenderEmbed = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-embed
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></site-embed>`;
};

class OwbEmbed extends withVariantConfig(LitElement) {
  static styles = unsafeCSS(styles);

  render() {
    const { html: rawHtml = "" } = this.config;
    const safeHtml = sanitizeEmbedHtml(rawHtml);

    if (!safeHtml.trim()) {
      return html`<div class="embed-placeholder">No embed content</div>`;
    }

    return html`<div class="embed-preview">${unsafeHTML(safeHtml)}</div>`;
  }
}

if (!customElements.get("site-embed")) {
  customElements.define("site-embed", SiteEmbed);
}

if (!customElements.get("owb-embed")) {
  customElements.define("owb-embed", OwbEmbed);
}
