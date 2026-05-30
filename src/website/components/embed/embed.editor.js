import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import styles from "./styles.css?inline";
import { OwbEmbed, defaultEmbedConfig } from "./embed.js";

export { defaultEmbedConfig };

OwbEmbed.editorPlugin = {};

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
        return { ...currentNode, html: nextHtml };
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
    this.node = { ...this.node, html: nextHtml };
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

  // Spacing and custom CSS are rendered inside owb-embed, not in site-embed.
  applySpacingToRenderRoot() {}
  applyCustomCssToRenderRoot() {}

  render() {
    const settings = {
      settingSpacingPaddingTop: this.settingSpacingPaddingTop,
      settingSpacingPaddingRight: this.settingSpacingPaddingRight,
      settingSpacingPaddingBottom: this.settingSpacingPaddingBottom,
      settingSpacingPaddingLeft: this.settingSpacingPaddingLeft,
      settingSpacingMarginTop: this.settingSpacingMarginTop,
      settingSpacingMarginRight: this.settingSpacingMarginRight,
      settingSpacingMarginBottom: this.settingSpacingMarginBottom,
      settingSpacingMarginLeft: this.settingSpacingMarginLeft,
      settingSpacingBorderRadius: this.settingSpacingBorderRadius,
      settingSpacingBackgroundColor: this.settingSpacingBackgroundColor,
      settingSpacingTextColor: this.settingSpacingTextColor,
      settingSpacingHidden: this.settingSpacingHidden,
      customCss: this.settingCustomCss,
    };
    return html`
      <div
        data-editor-block
        @pointerdown=${() => this.openEmbedSettingsIfNeeded()}
        class="embed-block ${this.isSettingsEditorOpen
          ? "is-settings-open"
          : ""}"
      >
        <owb-embed .html=${this.embedHtml} .settings=${settings}></owb-embed>
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

if (!customElements.get("site-embed")) {
  customElements.define("site-embed", SiteEmbed);
}

if (!customElements.get("owb-embed")) {
  customElements.define("owb-embed", OwbEmbed);
}
