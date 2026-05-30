import { LitElement, html, css } from "lit";

export const defaultGalleryConfig = {
  type: "gallery",
  images: [],
};

export class OwbGallery extends LitElement {
  static editorPlugin = null;

  static styles = css`
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
  `;

  static properties = {
    images: { type: Array },
    settings: { type: Object },
    node: { type: Object },
    pageConfig: { type: Object },
    lightboxIndex: { state: true },
  };

  constructor() {
    super();
    this.images = [];
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
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

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbGallery.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  _onKeydown(event) {
    if (this.lightboxIndex < 0) return;
    if (event.key === "Escape") this.closeLightbox();
    if (event.key === "ArrowRight") this.navigate(1);
    if (event.key === "ArrowLeft") this.navigate(-1);
  }

  openLightbox(index) {
    const images = Array.isArray(this.images) ? this.images : [];
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
    const images = Array.isArray(this.images) ? this.images : [];
    if (!images.length || this.lightboxIndex < 0) return;
    this.lightboxIndex =
      (this.lightboxIndex + delta + images.length) % images.length;
  }

  render() {
    const images = Array.isArray(this.images) ? this.images : [];
    const settings = this.settings ?? {};
    const cols = Math.max(1, Number.parseInt(settings.galleryColumns, 10) || 3);
    const format = String(settings.galleryFormat || "1 / 1");
    const gap = String(settings.galleryGap || "8px");
    const activeImage =
      this.lightboxIndex >= 0 ? images[this.lightboxIndex] : "";

    return html`
      <link rel="stylesheet" href="/owb-styles/gallery.css" />
      ${images.length === 0
        ? html`<div class="gallery-empty">No gallery images configured</div>`
        : html`
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
          `}
    `;
  }
}
