import { html, unsafeCSS } from "lit";
import { ChevronLeft, ChevronRight, Image, X, createElement } from "lucide";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import styles from "./styles.css?inline";
import { OwbGallery, defaultGalleryConfig } from "./gallery.js";

export { defaultGalleryConfig };

OwbGallery.editorPlugin = {};

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
        return { ...currentNode, images: nextImages };
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

    this.node = { ...this.node, images: nextImages };
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
                this.updateSettingsState({ galleryGap: event.detail.value })}
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

if (!customElements.get("site-gallery")) {
  customElements.define("site-gallery", SiteGallery);
}

if (!customElements.get("owb-gallery")) {
  customElements.define("owb-gallery", OwbGallery);
}
