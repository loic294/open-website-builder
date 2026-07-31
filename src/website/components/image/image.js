import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getSpacingStyleBlock } from "../../utils/spacing.js";
import {
  getImageSize,
  getImageUrlForSize,
} from "../../utils/image-size.js";

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
    isSettingsOpen: { state: true },
  };

  constructor() {
    super();
    this.url = "";
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
    this.lightboxOpen = false;
    this.isSettingsOpen = false;
    this.onWindowKeydown = this.onWindowKeydown.bind(this);
    this._onActiveOwnerChanged = this._onActiveOwnerChanged.bind(this);
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
    if (OwbImage.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbImage.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this.onWindowKeydown);
    if (OwbImage.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbImage.editorPlugin.onDisconnected?.(this);
    }
    super.disconnectedCallback();
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

  applyCustomCssToRenderRoot(cssText) {
    if (!(this.renderRoot instanceof ShadowRoot)) return;
    let styleEl = this.renderRoot.querySelector("style[data-custom-css]");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.setAttribute("data-custom-css", "true");
      this.renderRoot.appendChild(styleEl);
    }
    styleEl.textContent = String(cssText || "");
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
    const isEditorMode = OwbImage.editorPlugin !== null;
    if (isEditorMode) return renderImageFrame(url, mode);

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
    const imageUrl = getImageUrlForSize(
      url,
      getImageSize(settings?.imageSourceSize),
    );
    const customCss = String(settings?.customCss || "").trim();
    const spacingCss = getSpacingStyleBlock(settings);
    const clickAction = String(settings?.imageClickAction || "none");
    const linkUrl = String(settings?.imageLinkUrl || "").trim();
    const linkTarget = String(settings?.imageLinkTarget || "current");
    const isEditorMode = OwbImage.editorPlugin !== null;

    return html`
      <link rel="stylesheet" href="/owb-styles/image.css" />
      ${spacingCss
        ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`)
        : null}
      ${customCss ? unsafeHTML(`<style>${customCss}</style>`) : null}
      ${isEditorMode
        ? unsafeHTML(
            `<link rel="stylesheet" href="/src/editor/components/layout/editor-component/styles-blocks.css" />`,
          )
        : null}
      <div
        class="image-block size-${mode}${this.isSettingsOpen
          ? " is-settings-open"
          : ""}"
        data-editor-block=${isEditorMode ? "" : nothing}
        @pointerdown=${isEditorMode
          ? () => OwbImage.editorPlugin?.onPointerDown?.(this)
          : nothing}
      >
        ${this.renderImageWithAction(
          imageUrl,
          mode,
          clickAction,
          linkUrl,
          linkTarget,
        )}
      </div>
      ${this.lightboxOpen && imageUrl
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
              <img class="image-lightbox-image" src=${imageUrl} alt="" />
            </div>
          `
        : null}
    `;
  }
}
