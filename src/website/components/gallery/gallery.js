import { LitElement, html, css, unsafeCSS } from "lit";
import { ChevronLeft, ChevronRight, Image, X, createElement } from "lucide";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import styles from "./styles.css?inline";

export const defaultGalleryConfig = {
  type: "gallery",
  images: [],
};

const FORMAT_OPTIONS = [
  { label: "Square", value: "1 / 1" },
  { label: "3x2", value: "3 / 2" },
  { label: "4x3", value: "4 / 3" },
  { label: "16x9", value: "16 / 9" },
  { label: "2x3", value: "2 / 3" },
  { label: "3x4", value: "3 / 4" },
  { label: "9x16", value: "9 / 16" },
];

class SiteGallery extends withVariantConfig(EditorComponent) {
  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    galleryImages: { type: Array },
    galleryColumns: { type: Number },
    galleryFormat: { type: String },
    galleryGap: { type: String },
    lightboxIndex: { type: Number },
  };

  static styles = [super.styles, unsafeCSS(styles)];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.galleryImages = [];
    this.galleryColumns = 3;
    this.galleryFormat = "1 / 1";
    this.galleryGap = "8px";
    this.lightboxIndex = -1;
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

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.galleryImages = Array.isArray(this.node?.images)
        ? this.node.images
        : [];

      this.syncSettingsStateFromNode({
        galleryColumns: 3,
        galleryFormat: "1 / 1",
        galleryGap: "8px",
      });
    }
  }

  onWindowKeydown(event) {
    if (this.lightboxIndex < 0) {
      return;
    }

    if (event.key === "Escape") {
      this.closeLightbox();
    }

    if (event.key === "ArrowRight") {
      this.navigateLightbox(1);
    }

    if (event.key === "ArrowLeft") {
      this.navigateLightbox(-1);
    }
  }

  updateNodeImages(nodes, targetNodeId, nextImages) {
    return nodes.map((currentNode) => {
      if (currentNode?.id === targetNodeId && currentNode?.type === "gallery") {
        return {
          ...currentNode,
          images: nextImages,
        };
      }

      if (Array.isArray(currentNode?.content)) {
        return {
          ...currentNode,
          content: this.updateNodeImages(
            currentNode.content,
            targetNodeId,
            nextImages,
          ),
        };
      }

      return currentNode;
    });
  }

  updateImagesFromText(nextValue) {
    const nextImages = String(nextValue || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    this.galleryImages = nextImages;

    if (!this.pageConfig || !this.node?.id) {
      return;
    }

    const nextPageConfig = {
      ...this.pageConfig,
      content: this.updateNodeImages(
        Array.isArray(this.pageConfig.content) ? this.pageConfig.content : [],
        this.node.id,
        nextImages,
      ),
    };

    this.node = {
      ...this.node,
      images: nextImages,
    };
    this.pageConfig = nextPageConfig;
    this.dispatchPageConfigUpdated(nextPageConfig);
  }

  openGallerySettings() {
    this.syncSettingsStateFromNode({
      galleryColumns: 3,
      galleryFormat: "1 / 1",
      galleryGap: "8px",
    });

    this.openSettingsEditor({
      tabs: [{ id: "general", label: "General" }],
      content: () => html`
        <settings-section title="Photos">
          <textarea
            class="gallery-textarea"
            .value=${this.galleryImages.join("\n")}
            placeholder="One image URL per line"
            @input=${(event) => this.updateImagesFromText(event.target.value)}
          ></textarea>
        </settings-section>
        <settings-section title="Layout">
          <settings-section
            title="Layout"
            ?overridden=${this.hasAnyOverriddenKeys(
              "galleryColumns",
              "galleryFormat",
              "galleryGap",
            )}
          >
            <editor-text-input
              type="number"
              label="Columns"
              min=${1}
              max=${12}
              .value=${String(this.galleryColumns)}
              @change=${(event) =>
                this.updateSettingsState({
                  galleryColumns: Math.max(
                    1,
                    Math.min(12, Number.parseInt(event.detail.value, 10) || 1),
                  ),
                })}
            ></editor-text-input>
            <editor-select
              label="Picture format"
              .value=${this.galleryFormat}
              .options=${FORMAT_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              @change=${(event) =>
                this.updateSettingsState({
                  galleryFormat: event.detail.value,
                })}
            ></editor-select>
            <editor-text-input
              label="Gap"
              placeholder="8px"
              .value=${this.galleryGap}
              @change=${(event) =>
                this.updateSettingsState({
                  galleryGap: event.detail.value,
                })}
            ></editor-text-input>
          </settings-section>
        </settings-section>
      `,
    });
  }

  openGallerySettingsIfNeeded() {
    if (this.isSettingsEditorOpen) {
      return;
    }

    this.openGallerySettings();
  }

  openLightbox(index) {
    if (index < 0 || index >= this.galleryImages.length) {
      return;
    }

    this.lightboxIndex = index;
  }

  closeLightbox() {
    this.lightboxIndex = -1;
  }

  navigateLightbox(delta) {
    if (this.galleryImages.length === 0 || this.lightboxIndex < 0) {
      return;
    }

    const nextIndex =
      (this.lightboxIndex + delta + this.galleryImages.length) %
      this.galleryImages.length;
    this.lightboxIndex = nextIndex;
  }

  render() {
    const columns = Math.max(1, Number.parseInt(this.galleryColumns, 10) || 1);
    const gap = String(this.galleryGap || "8px").trim() || "8px";
    const activeImage =
      this.lightboxIndex >= 0 ? this.galleryImages[this.lightboxIndex] : "";

    return html`
      <div
        data-editor-block
        @pointerdown=${() => this.openGallerySettingsIfNeeded()}
        class="gallery-block ${this.isSettingsEditorOpen
          ? "is-settings-open"
          : ""}"
      >
        ${this.galleryImages.length > 0
          ? html`
              <div
                class="gallery-grid"
                style=${`--gallery-columns: ${columns}; --gallery-gap: ${gap}; --gallery-ratio: ${this.galleryFormat};`}
              >
                ${this.galleryImages.map(
                  (url, index) => html`
                    <button
                      type="button"
                      class="gallery-thumb"
                      title="Open image"
                      @click=${() => this.openLightbox(index)}
                    >
                      <img src=${url} alt="" loading="lazy" />
                    </button>
                  `,
                )}
              </div>
            `
          : html`
              <div class="gallery-empty">
                ${createElement(Image)}
                <span>Add image URLs in settings.</span>
              </div>
            `}
        ${this.lightboxIndex >= 0
          ? html`
              <div
                class="gallery-lightbox"
                @click=${() => this.closeLightbox()}
              >
                <button
                  class="gallery-lightbox-close"
                  type="button"
                  @click=${(event) => {
                    event.stopPropagation();
                    this.closeLightbox();
                  }}
                >
                  ${createElement(X)}
                </button>
                <button
                  class="gallery-lightbox-nav is-prev"
                  type="button"
                  @click=${(event) => {
                    event.stopPropagation();
                    this.navigateLightbox(-1);
                  }}
                >
                  ${createElement(ChevronLeft)}
                </button>
                <img class="gallery-lightbox-image" src=${activeImage} alt="" />
                <button
                  class="gallery-lightbox-nav is-next"
                  type="button"
                  @click=${(event) => {
                    event.stopPropagation();
                    this.navigateLightbox(1);
                  }}
                >
                  ${createElement(ChevronRight)}
                </button>
              </div>
            `
          : null}
      </div>
    `;
  }
}

export const editorRenderGallery = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-gallery
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></site-gallery>`;
};

class OwbGallery extends withVariantConfig(LitElement) {
  static styles = [
    unsafeCSS(styles),
    css`
      :host {
        display: block;
      }

      .lightbox {
        border: none;
        padding: 0;
        background: rgba(17, 24, 39, 0.95);
        max-width: 100vw;
        max-height: 100dvh;
        width: 100vw;
        height: 100dvh;
      }

      .lightbox::backdrop {
        background: rgba(0, 0, 0, 0.72);
      }

      .lightbox-inner {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        padding: 24px;
        box-sizing: border-box;
        position: relative;
      }

      .lightbox img {
        max-width: min(92vw, 1200px);
        max-height: 90dvh;
        object-fit: contain;
        display: block;
      }

      .lightbox-close,
      .lightbox-nav {
        position: absolute;
        border: 0;
        border-radius: 999px;
        width: 38px;
        height: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.18);
        color: #fff;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
      }

      .lightbox-close {
        top: 16px;
        right: 16px;
      }

      .lightbox-nav.is-prev {
        left: 16px;
      }

      .lightbox-nav.is-next {
        right: 16px;
      }
    `,
  ];

  static properties = {
    lightboxIndex: { state: true },
  };

  constructor() {
    super();
    this.lightboxIndex = -1;
    this._onKeydown = this._onKeydown.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this._onKeydown);
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this._onKeydown);
    super.disconnectedCallback();
  }

  _onKeydown(event) {
    if (this.lightboxIndex < 0) return;
    if (event.key === "Escape") this.closeLightbox();
    if (event.key === "ArrowRight") this.navigate(1);
    if (event.key === "ArrowLeft") this.navigate(-1);
  }

  openLightbox(index) {
    const { images = [] } = this.config;
    if (index < 0 || index >= images.length) return;
    this.lightboxIndex = index;
    this.updateComplete.then(() => {
      this.renderRoot.querySelector("dialog")?.showModal();
    });
  }

  closeLightbox() {
    this.renderRoot.querySelector("dialog")?.close();
    this.lightboxIndex = -1;
  }

  navigate(delta) {
    const { images = [] } = this.config;
    if (!images.length || this.lightboxIndex < 0) return;
    this.lightboxIndex =
      (this.lightboxIndex + delta + images.length) % images.length;
  }

  render() {
    const {
      images = [],
      columns = 3,
      format = "1 / 1",
      gap = "8px",
    } = this.config;

    const cols = Math.max(1, Number.parseInt(columns, 10) || 3);
    const activeImage =
      this.lightboxIndex >= 0 ? images[this.lightboxIndex] : "";

    if (images.length === 0) {
      return html`<div class="gallery-empty">
        No gallery images configured
      </div>`;
    }

    return html`
      <div
        class="gallery-grid"
        style="--gallery-columns: ${cols}; --gallery-gap: ${gap}; --gallery-ratio: ${format};"
      >
        ${images.map(
          (url, index) => html`
            <button
              type="button"
              class="gallery-thumb"
              @click=${() => this.openLightbox(index)}
            >
              <img src="${url}" alt="" loading="lazy" />
            </button>
          `,
        )}
      </div>

      <dialog
        class="lightbox"
        @click=${(event) => {
          if (event.target === event.currentTarget) this.closeLightbox();
        }}
      >
        <div class="lightbox-inner">
          <img src="${activeImage}" alt="" />
          <button
            class="lightbox-close"
            type="button"
            @click=${() => this.closeLightbox()}
          >
            X
          </button>
          ${images.length > 1
            ? html`
                <button
                  class="lightbox-nav is-prev"
                  type="button"
                  @click=${() => this.navigate(-1)}
                >
                  &#8249;
                </button>
                <button
                  class="lightbox-nav is-next"
                  type="button"
                  @click=${() => this.navigate(1)}
                >
                  &#8250;
                </button>
              `
            : null}
        </div>
      </dialog>
    `;
  }
}

if (!customElements.get("site-gallery")) {
  customElements.define("site-gallery", SiteGallery);
}

if (!customElements.get("owb-gallery")) {
  customElements.define("owb-gallery", OwbGallery);
}
