import { LitElement, html, unsafeCSS } from "lit";
import { Image as ImageIcon, createElement } from "lucide";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import styles from "./styles.css?inline";

export const defaultImageConfig = {
  type: "image",
  url: "",
};

function getImageMode(value) {
  const mode = String(value || "contained");
  return mode === "full-width" || mode === "contained" || mode === "cover"
    ? mode
    : "contained";
}

function renderImageFrame(url, mode) {
  if (!url) {
    return html`<div class="image-frame size-${mode}"></div>`;
  }

  return html`<div class="image-frame size-${mode}">
    <img src=${url} alt="" loading="lazy" />
  </div>`;
}

class SiteImage extends withVariantConfig(EditorComponent) {
  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    imageUrl: { type: String },
    imageSizeMode: { type: String },
  };

  static styles = [super.styles, unsafeCSS(styles)];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.imageUrl = "";
    this.imageSizeMode = "contained";
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.imageUrl =
        this.node && typeof this.node.url === "string" ? this.node.url : "";

      this.syncSettingsStateFromNode({
        imageSizeMode: "contained",
      });
    }
  }

  updateImageSizeMode(nextMode) {
    const normalizedMode = getImageMode(nextMode);

    const nextState = {
      imageSizeMode: normalizedMode,
    };

    if (normalizedMode === "full-width") {
      nextState.gridRowSpan = 1;
    }

    this.updateSettingsState(nextState);
  }

  updateNodeUrl(nodes, targetNodeId, nextUrl) {
    return nodes.map((currentNode) => {
      if (currentNode?.id === targetNodeId && currentNode?.type === "image") {
        return {
          ...currentNode,
          url: nextUrl,
        };
      }

      if (Array.isArray(currentNode?.content)) {
        return {
          ...currentNode,
          content: this.updateNodeUrl(
            currentNode.content,
            targetNodeId,
            nextUrl,
          ),
        };
      }

      return currentNode;
    });
  }

  updateImageUrl(nextUrl) {
    this.imageUrl = nextUrl;

    if (!this.pageConfig || !this.node?.id) {
      return;
    }

    const nextPageConfig = {
      ...this.pageConfig,
      content: this.updateNodeUrl(
        Array.isArray(this.pageConfig.content) ? this.pageConfig.content : [],
        this.node.id,
        nextUrl,
      ),
    };

    this.node = {
      ...this.node,
      url: nextUrl,
    };
    this.pageConfig = nextPageConfig;
    this.dispatchPageConfigUpdated(nextPageConfig);
  }

  previewImageUrl(nextUrl) {
    this.imageUrl = nextUrl;
  }

  openImageSettings() {
    this.syncSettingsStateFromNode({
      imageSizeMode: "contained",
    });

    this.openSettingsEditor({
      tabs: [{ id: "general", label: "General" }],
      content: () => html`
        <div>
          <settings-section title="Image">
            <editor-text-input
              label="URL"
              placeholder="https://example.com/image.jpg"
              .value=${this.imageUrl}
              @input=${(e) => this.previewImageUrl(e.detail.value)}
              @change=${(e) => this.updateImageUrl(e.detail.value)}
            ></editor-text-input>

            <editor-radio-button
              .options=${[
                { label: "Full width", value: "full-width" },
                { label: "Contained", value: "contained" },
                { label: "Cover", value: "cover" },
              ]}
              .value=${this.imageSizeMode}
              @change=${(e) => this.updateImageSizeMode(e.detail.value)}
            ></editor-radio-button>
          </settings-section>
        </div>
      `,
    });
  }

  openImageSettingsIfNeeded() {
    if (this.isSettingsEditorOpen) {
      return;
    }

    this.openImageSettings();
  }

  render() {
    return html`
      <div
        data-editor-block
        @pointerdown=${() => this.openImageSettingsIfNeeded()}
        class="image-block size-${this.imageSizeMode} ${this
          .isSettingsEditorOpen
          ? "is-settings-open"
          : ""}"
      >
        <div class="image-frame size-${this.imageSizeMode}">
          ${this.imageUrl
            ? html`<img src=${this.imageUrl} alt="" loading="lazy" />`
            : html`
                <div class="image-placeholder">
                  ${createElement(ImageIcon)}
                  <span>Add an image URL in settings</span>
                </div>
              `}
        </div>
      </div>
    `;
  }
}

export const editorRenderImage = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-image
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></site-image>`;
};

class OwbImage extends withVariantConfig(LitElement) {
  static styles = [
    unsafeCSS(styles),
    unsafeCSS(`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `),
  ];

  render() {
    const { url = "", settings = {} } = this.config;
    const mode = getImageMode(settings?.imageSizeMode || "contained");
    const customCss = String(settings?.customCss || "").trim();

    return html`
      ${customCss
        ? html`<style>
            ${customCss}
          </style>`
        : null}
      <div class="image-block size-${mode}">${renderImageFrame(url, mode)}</div>
    `;
  }
}

if (!customElements.get("site-image")) {
  customElements.define("site-image", SiteImage);
}

if (!customElements.get("owb-image")) {
  customElements.define("owb-image", OwbImage);
}
