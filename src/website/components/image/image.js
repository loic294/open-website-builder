import { LitElement, html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

export const defaultImageConfig = {
  type: "image",
  url: "",
};

export function getImageMode(value) {
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

export class OwbImage extends LitElement {
  static editorPlugin = null;

  static properties = {
    url: { type: String },
    settings: { type: Object },
    node: { type: Object },
    pageConfig: { type: Object },
    lightboxOpen: { state: true },
  };

  constructor() {
    super();
    this.url = "";
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
    this.lightboxOpen = false;
    this.onWindowKeydown = this.onWindowKeydown.bind(this);
  }

  connectedCallback() {
    const dataProps = this.getAttribute("data-props");
    if (dataProps) {
      try {
        const props = JSON.parse(dataProps);
        if (props.url !== undefined) this.url = props.url;
        if (props.settings !== undefined) this.settings = props.settings;
      } catch (e) {}
    }
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

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbImage.editorPlugin?.onUpdated?.(this, changedProperties);
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
    const url = this.url ?? "";
    const settings = this.settings ?? {};
    const mode = getImageMode(settings?.imageSizeMode || "contained");
    const customCss = String(settings?.customCss || "").trim();
    const clickAction = String(settings?.imageClickAction || "none");
    const linkUrl = String(settings?.imageLinkUrl || "").trim();
    const linkTarget = String(settings?.imageLinkTarget || "current");

    return html`
      <link rel="stylesheet" href="/owb-styles/image.css" />
      ${customCss ? unsafeHTML(`<style>${customCss}</style>`) : null}
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
