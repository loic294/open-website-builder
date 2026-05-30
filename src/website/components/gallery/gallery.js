import { LitElement, html, css, isServer, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getSpacingStyleBlock } from "../../utils/spacing.js";
import { createElement, X, ChevronLeft, ChevronRight } from "lucide";

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
      background: rgba(255, 255, 255, 0.95);
      max-width: 100vw;
      max-height: 100dvh;
      width: 100vw;
      height: 100dvh;
    }

    .lightbox::backdrop {
      background: rgba(255, 255, 255, 0.5);
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
      color: #000;
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
    isSettingsOpen: { state: true },
  };

  constructor() {
    super();
    this.images = [];
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
    this.lightboxIndex = -1;
    this.isSettingsOpen = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._onActiveOwnerChanged = this._onActiveOwnerChanged.bind(this);
  }

  connectedCallback() {
    const dataProps = this.getAttribute("data-props");
    if (dataProps) {
      try {
        const props = JSON.parse(dataProps);
        if (props.images !== undefined) this.images = props.images;
        if (props.settings !== undefined) this.settings = props.settings;
      } catch (e) {}
    }
    super.connectedCallback();
    window.addEventListener("keydown", this._onKeydown);
    if (OwbGallery.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbGallery.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this._onKeydown);
    if (OwbGallery.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbGallery.editorPlugin.onDisconnected?.(this);
    }
    super.disconnectedCallback();
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbGallery.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  _onActiveOwnerChanged(event) {
    const ownerNodeId = String(event?.detail?.ownerNodeId || "");
    this.isSettingsOpen = Boolean(
      ownerNodeId && ownerNodeId === String(this.node?.id || ""),
    );
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
    const spacingCss = getSpacingStyleBlock(settings);
    const isEditorMode = OwbGallery.editorPlugin !== null;

    return html`
      <link rel="stylesheet" href="/owb-styles/gallery.css" />
      ${spacingCss
        ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`)
        : null}
      <div
        class="gallery-block${this.isSettingsOpen ? " is-settings-open" : ""}"
        data-editor-block=${isEditorMode ? "" : nothing}
        @pointerdown=${isEditorMode
          ? () => OwbGallery.editorPlugin?.onPointerDown?.(this)
          : nothing}
      >
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
              ${isServer
                ? null
                : html`<dialog
                    class="lightbox"
                    @click=${(event) => {
                      if (event.target === event.currentTarget)
                        this.closeLightbox();
                    }}
                  >
                    <div class="lightbox-inner">
                      <img src="${activeImage}" alt="" />
                      <button
                        class="lightbox-close"
                        type="button"
                        @click=${() => this.closeLightbox()}
                      >
                        ${createElement(X)}
                      </button>
                      ${images.length > 1
                        ? html`
                            <button
                              class="lightbox-nav is-prev"
                              type="button"
                              @click=${() => this.navigate(-1)}
                            >
                              ${createElement(ChevronLeft)}
                            </button>
                            <button
                              class="lightbox-nav is-next"
                              type="button"
                              @click=${() => this.navigate(1)}
                            >
                              ${createElement(ChevronRight)}
                            </button>
                          `
                        : null}
                    </div>
                  </dialog>`}
            `}
      </div>
    `;
  }
}
