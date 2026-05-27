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
    imageClickAction: { type: String },
    imageLinkUrl: { type: String },
    imageLinkTarget: { type: String },
  };

  static styles = [super.styles, unsafeCSS(styles)];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.imageUrl = "";
    this.imageSizeMode = "contained";
    this.imageClickAction = "none";
    this.imageLinkUrl = "";
    this.imageLinkTarget = "current";
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.imageUrl =
        this.node && typeof this.node.url === "string" ? this.node.url : "";

      this.syncSettingsStateFromNode({
        imageSizeMode: "contained",
        imageClickAction: "none",
        imageLinkUrl: "",
        imageLinkTarget: "current",
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
      imageClickAction: "none",
      imageLinkUrl: "",
      imageLinkTarget: "current",
    });

    this.openSettingsEditor({
      tabs: [{ id: "general", label: "General" }],
      content: () => html`
        <div>
          <settings-section title="Image">
                      <settings-section title="Image" ?overridden=${this.hasAnyOverriddenKeys("imageSizeMode", "url")}>
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
          <settings-section title="Interaction">
                      <settings-section title="Interaction" ?overridden=${this.hasAnyOverriddenKeys("imageClickAction", "imageLinkUrl", "imageLinkTarget")}>
            <editor-radio-button
              .options=${[
                { label: "Do nothing", value: "none" },
                { label: "Open a link", value: "link" },
                { label: "Open image in lightbox", value: "lightbox" },
              ]}
              .value=${this.imageClickAction}
              @change=${(event) => {
                this.updateSettingsState({
                  imageClickAction: event.detail.value,
                });
              }}
            ></editor-radio-button>

            ${
              this.imageClickAction === "link"
                ? html`
                    <editor-text-input
                      label="Link URL"
                      placeholder="https://example.com"
                      .value=${this.imageLinkUrl}
                      @change=${(event) => {
                        this.updateSettingsState({
                          imageLinkUrl: event.detail.value,
                        });
                      }}
                    ></editor-text-input>
                    <editor-radio-button
                      .options=${[
                        { label: "Open in current page", value: "current" },
                        { label: "Open in new tab", value: "new" },
                      ]}
                      .value=${this.imageLinkTarget}
                      @change=${(event) => {
                        this.updateSettingsState({
                          imageLinkTarget: event.detail.value,
                        });
                      }}
                    ></editor-radio-button>
                  `
                : null
            }
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
  static properties = {
    lightboxOpen: { state: true },
  };

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

  constructor() {
    super();
    this.lightboxOpen = false;
    this.onWindowKeydown = this.onWindowKeydown.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.onWindowKeydown);
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this.onWindowKeydown);
    super.disconnectedCallback();
  }

  onWindowKeydown(event) {
    if (!this.lightboxOpen) {
      return;
    }

    if (event.key === "Escape") {
      this.lightboxOpen = false;
    }
  }

  openLightbox() {
    this.lightboxOpen = true;
  }

  closeLightbox() {
    this.lightboxOpen = false;
  }

  renderImageWithAction(url, mode, clickAction, linkUrl, linkTarget) {
    const normalizedAction =
      clickAction === "link" || clickAction === "lightbox"
        ? clickAction
        : "none";

    if (normalizedAction === "link") {
      const href = String(linkUrl || "").trim();
      if (!href) {
        return renderImageFrame(url, mode);
      }

      const target = linkTarget === "new" ? "_blank" : "_self";

      return html`<a
        class="image-action-link"
        href=${href}
        target=${target}
        rel=${target === "_blank" ? "noopener noreferrer" : null}
      >
        ${renderImageFrame(url, mode)}
      </a>`;
    }

    if (normalizedAction === "lightbox" && url) {
      return html`<button
        class="image-lightbox-trigger"
        type="button"
        @click=${() => this.openLightbox()}
      >
        ${renderImageFrame(url, mode)}
      </button>`;
    }

    return renderImageFrame(url, mode);
  }

  render() {
    const { url = "", settings = {} } = this.config;
    const mode = getImageMode(settings?.imageSizeMode || "contained");
    const customCss = String(settings?.customCss || "").trim();
    const clickAction = String(settings?.imageClickAction || "none");
    const linkUrl = String(settings?.imageLinkUrl || "").trim();
    const linkTarget = String(settings?.imageLinkTarget || "current");

    return html`
      ${customCss
        ? html`<style>
            ${customCss}
          </style>`
        : null}
      <div class="image-block size-${mode}">
        ${this.renderImageWithAction(
          url,
          mode,
          clickAction,
          linkUrl,
          linkTarget,
        )}
      </div>
      ${this.lightboxOpen && url
        ? html`
            <div class="image-lightbox" @click=${() => this.closeLightbox()}>
              <button
                class="image-lightbox-close"
                type="button"
                aria-label="Close image"
                @click=${(event) => {
                  event.stopPropagation();
                  this.closeLightbox();
                }}
              >
                x
              </button>
              <img class="image-lightbox-image" src=${url} alt="" />
            </div>
          `
        : null}
    `;
  }
}

if (!customElements.get("site-image")) {
  customElements.define("site-image", SiteImage);
}

if (!customElements.get("owb-image")) {
  customElements.define("owb-image", OwbImage);
}
